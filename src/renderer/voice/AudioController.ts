import { Player, AmongUsState } from '../../common/AmongUsState';
import { ISettings, ILobbySettings } from '../../common/ISettings';
import { IpcRendererMessages } from '../../common/ipc-messages';
import { pushToTalkOptions } from '../../common/pushToTalkOptions';
import { ipcRenderer } from '../lib/electron-bridge';
import { TypedEmitter } from '../lib/TypedEmitter';
import VAD, { VADOptions } from '../lib/vad';
import SettingsStore from '../settings/SettingsStore';
import { calculateVoiceAudio } from './spatialAudio';
import { ExtendedAudioElement, PeerAudioNodes } from './types';

interface VadNode {
	connect: () => void;
	destroy: () => void;
	options: VADOptions;
	init: () => void;
}

interface AudioControllerEvents extends Record<string, unknown[]> {
	talking: [boolean];
	muteStateChanged: [muted: boolean, deafened: boolean];
	peerAudioReady: [peerId: string];
	error: [string];
}

const REVERB_URL = import.meta.env.DEV
	? `${window.location.origin}/sounds/reverb.ogx`
	: 'app://bundle/sounds/reverb.ogx';

export class AudioController extends TypedEmitter<AudioControllerEvents> {
	private started = false;
	private inputStream?: MediaStream;
	private stream?: MediaStream;
	private context?: AudioContext;
	private masterGain?: GainNode;
	private masterDestination?: MediaStreamAudioDestinationNode;
	private masterElement?: ExtendedAudioElement;
	private useContextSink = false;
	private microphoneGain?: GainNode;
	private audioListener?: VadNode;
	private convolverBuffer: AudioBuffer | null = null;
	private peers = new Map<string, PeerAudioNodes>();
	private ipcHandlers: [string, (...args: unknown[]) => void][] = [];

	private pushToTalkMode: number = pushToTalkOptions.VOICE;
	private mutedState = false;
	private deafenedState = false;
	private maxDistance = 2;

	get outboundStream(): MediaStream | undefined {
		return this.stream;
	}

	get muted(): boolean {
		return this.mutedState;
	}

	get deafened(): boolean {
		return this.deafenedState;
	}

	get running(): boolean {
		return this.started;
	}

	async start(): Promise<void> {
		if (this.started) return;
		this.started = true;

		const settings = SettingsStore.store;
		this.pushToTalkMode = settings.pushToTalkMode;

		const context = new AudioContext();
		this.context = context;
		void context.resume().catch(() => {
			/* resumed on first user gesture instead */
		});
		this.createOutputBus(settings.speaker);
		void this.loadConvolverBuffer();

		const constraints = {
			deviceId: undefined as unknown as string,
			autoGainControl: false,
			channelCount: 2,
			echoCancellation: settings.echoCancellation,
			latency: 0,
			noiseSuppression: settings.noiseSuppression, // @ts-ignore-line
			googNoiseSuppression: settings.noiseSuppression, // @ts-ignore-line
			googEchoCancellation: settings.echoCancellation, // @ts-ignore-line
			googTypingNoiseDetection: settings.noiseSuppression, // @ts-ignore-line
			sampleRate: settings.oldSampleDebug ? 48000 : undefined,
			sampleSize: settings.oldSampleDebug ? 16 : undefined,
		};
		if (settings.microphone.toLowerCase() !== 'default') {
			constraints.deviceId = settings.microphone;
		}

		let inputStream: MediaStream;
		try {
			inputStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: constraints });
		} catch (error) {
			this.started = false;
			this.teardownGraph();
			this.emit('error', "Couldn't connect to your microphone:\n" + error);
			throw error;
		}

		if (!this.started) {
			inputStream.getTracks().forEach((track) => track.stop());
			this.teardownGraph();
			return;
		}

		this.inputStream = inputStream;
		this.stream = inputStream;

		const source = context.createMediaStreamSource(inputStream);

		if (settings.microphoneGainEnabled || settings.micSensitivityEnabled) {
			const microphoneGain = context.createGain();
			const destination = context.createMediaStreamDestination();
			source.connect(microphoneGain);
			microphoneGain.gain.value = settings.microphoneGainEnabled ? settings.microphoneGain / 100 : 1;
			microphoneGain.connect(destination);
			this.microphoneGain = microphoneGain;
			this.stream = destination.stream;
		}

		if (settings.vadEnabled) {
			const audioListener = VAD(context, source, undefined, {
				onVoiceStart: () => {
					const current = SettingsStore.store;
					if (this.microphoneGain && current.micSensitivityEnabled) {
						this.microphoneGain.gain.value = current.microphoneGainEnabled ? current.microphoneGain / 100 : 1;
					}
					this.emit('talking', true);
				},
				onVoiceStop: () => {
					if (this.microphoneGain && SettingsStore.store.micSensitivityEnabled) {
						this.microphoneGain.gain.value = 0;
					}
					this.emit('talking', false);
				},
				noiseCaptureDuration: 0,
				stereo: false,
			}) as VadNode;

			audioListener.options.minNoiseLevel = settings.micSensitivityEnabled ? settings.micSensitivity : 0.15;
			audioListener.options.maxNoiseLevel = 1;
			audioListener.init();
			this.audioListener = audioListener;
		}

		this.applyTrackEnabled();
		this.registerHotkeys();
	}

	stop(): void {
		if (!this.started) return;
		this.started = false;

		this.unregisterHotkeys();

		for (const peerId of Array.from(this.peers.keys())) {
			this.removePeer(peerId);
		}

		this.audioListener?.destroy();
		this.audioListener = undefined;

		this.inputStream?.getTracks().forEach((track) => track.stop());
		this.inputStream = undefined;
		this.stream = undefined;
		this.microphoneGain = undefined;

		this.teardownGraph();

		this.mutedState = false;
		this.deafenedState = false;
		this.removeAllListeners();
	}

	private createOutputBus(speaker: string): void {
		const context = this.context;
		if (!context) return;

		const masterGain = context.createGain();
		masterGain.gain.value = 1;
		this.masterGain = masterGain;

		this.useContextSink = 'setSinkId' in AudioContext.prototype;
		if (this.useContextSink) {
			masterGain.connect(context.destination);
		} else {
			const masterDestination = context.createMediaStreamDestination();
			masterGain.connect(masterDestination);
			const element = document.createElement('audio') as ExtendedAudioElement;
			document.body.appendChild(element);
			element.setAttribute('autoplay', '');
			element.srcObject = masterDestination.stream;
			this.masterDestination = masterDestination;
			this.masterElement = element;
		}

		this.setSpeaker(speaker);
	}

	private teardownGraph(): void {
		this.masterGain?.disconnect();
		this.masterGain = undefined;
		this.masterDestination?.disconnect();
		this.masterDestination = undefined;

		if (this.masterElement) {
			this.teardownAudioElement(this.masterElement);
			this.masterElement = undefined;
		}

		const context = this.context;
		this.context = undefined;
		if (context) {
			context.close().catch(() => {
				/* already closed */
			});
		}
	}

	setSpeaker(deviceId: string): void {
		const sinkId = !deviceId || deviceId.toLowerCase() === 'default' ? '' : deviceId;
		const onError = (error: unknown) => console.warn('Failed to set audio output device', error);

		if (this.useContextSink) {
			const context = this.context as (AudioContext & { setSinkId?: (id: string) => Promise<void> }) | undefined;
			context?.setSinkId?.(sinkId).catch(onError);
			return;
		}

		this.masterElement?.setSinkId(sinkId).catch(onError);
	}

	private async loadConvolverBuffer(): Promise<void> {
		const context = this.context;
		if (!context) return;
		try {
			const response = await fetch(REVERB_URL);
			const buffer = await context.decodeAudioData(await response.arrayBuffer());
			this.convolverBuffer = buffer;
			for (const peer of this.peers.values()) {
				peer.reverb.buffer = buffer;
			}
		} catch (error) {
			console.warn('Failed to load reverb impulse response', error);
		}
	}

	private registerHotkeys(): void {
		const add = (channel: string, handler: (...args: unknown[]) => void) => {
			ipcRenderer.on(channel, handler);
			this.ipcHandlers.push([channel, handler]);
		};

		add(IpcRendererMessages.TOGGLE_DEAFEN, () => this.toggleDeafen());
		add(IpcRendererMessages.TOGGLE_MUTE, () => this.toggleMute());
		add(IpcRendererMessages.PUSH_TO_TALK, (_: unknown, pressing: boolean) => {
			if (this.pushToTalkMode === pushToTalkOptions.VOICE) return;
			if (this.deafenedState || this.mutedState) return;
			const track = this.inputStream?.getAudioTracks()[0];
			if (!track) return;
			track.enabled = this.pushToTalkMode === pushToTalkOptions.PUSH_TO_TALK ? pressing : !pressing;
		});
	}

	private unregisterHotkeys(): void {
		for (const [channel, handler] of this.ipcHandlers) {
			ipcRenderer.off(channel, handler);
		}
		this.ipcHandlers = [];
	}

	private applyTrackEnabled(): void {
		const track = this.inputStream?.getAudioTracks()[0];
		if (!track) return;
		track.enabled = !this.deafenedState && !this.mutedState && this.pushToTalkMode !== pushToTalkOptions.PUSH_TO_TALK;
	}

	setPushToTalkMode(mode: number): void {
		this.pushToTalkMode = mode;
		this.applyTrackEnabled();
	}

	toggleMute(): void {
		this.mutedState = !this.mutedState;
		if (this.deafenedState) {
			this.deafenedState = false;
			this.mutedState = false;
		}
		this.applyTrackEnabled();
		this.emit('muteStateChanged', this.mutedState, this.deafenedState);
	}

	toggleDeafen(): void {
		this.deafenedState = !this.deafenedState;
		this.applyTrackEnabled();
		this.emit('muteStateChanged', this.mutedState, this.deafenedState);
	}

	updateMicrophoneSettings(settings: ISettings): void {
		if (!this.microphoneGain?.gain) return;
		if (!settings.microphoneGainEnabled && !settings.micSensitivityEnabled) return;

		if (!settings.micSensitivityEnabled) {
			this.microphoneGain.gain.value = settings.microphoneGainEnabled ? settings.microphoneGain / 100 : 1;
		}
		if (this.audioListener?.options) {
			this.audioListener.options.minNoiseLevel = settings.micSensitivity;
			this.audioListener.init();
		}
	}

	setMaxDistance(maxDistance: number): void {
		this.maxDistance = maxDistance;
		for (const peer of this.peers.values()) {
			peer.pan.maxDistance = maxDistance;
		}
	}

	hasPeer(peerId: string): boolean {
		return this.peers.has(peerId);
	}

	addPeer(peerId: string, stream: MediaStream): void {
		this.removePeer(peerId);

		const context = this.context;
		const masterGain = this.masterGain;
		if (!context || !masterGain) return;

		void context.resume().catch(() => {
			/* resumed on first user gesture instead */
		});

		const dummyAudioElement = new Audio();
		dummyAudioElement.srcObject = stream;

		const source = context.createMediaStreamSource(stream);

		const gain = context.createGain();
		gain.gain.value = 0;

		const pan = context.createPanner();
		pan.refDistance = 0.1;
		pan.panningModel = 'equalpower';
		pan.distanceModel = 'linear';
		pan.maxDistance = this.maxDistance;
		pan.rolloffFactor = 1;

		const muffle = context.createBiquadFilter();
		muffle.type = 'lowpass';

		const reverb = context.createConvolver();
		reverb.buffer = this.convolverBuffer;

		source.connect(pan);
		pan.connect(gain);
		gain.connect(masterGain);

		this.peers.set(peerId, {
			dummyAudioElement,
			gain,
			pan,
			reverb,
			muffle,
			muffleConnected: false,
			reverbConnected: false,
			source,
		});

		this.emit('peerAudioReady', peerId);
	}

	removePeer(peerId: string): void {
		const peer = this.peers.get(peerId);
		if (!peer) return;
		this.peers.delete(peerId);

		this.teardownAudioElement(peer.dummyAudioElement);
		peer.source.disconnect();
		peer.pan.disconnect();
		peer.gain.disconnect();
		peer.reverb?.disconnect();
		peer.muffle?.disconnect();
	}

	private teardownAudioElement(element: HTMLAudioElement): void {
		element.pause();
		if (element.srcObject) {
			(element.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
		}
		element.removeAttribute('src');
		element.srcObject = null;
		element.load();
		element.remove();
	}

	silenceAllPeers(): void {
		for (const peer of this.peers.values()) {
			peer.gain.gain.value = 0;
		}
	}

	silencePeersExcept(peerIds: string[]): void {
		for (const [peerId, peer] of this.peers) {
			if (!peerIds.includes(peerId)) {
				peer.gain.gain.value = 0;
			}
		}
	}

	setPeerGain(peerId: string, gain: number): void {
		const peer = this.peers.get(peerId);
		if (peer) peer.gain.gain.value = gain;
	}

	/**
	 * Returns the pre-volume gain for the peer, or `null` when the peer has no audio graph yet.
	 */
	applyVoiceAudio(
		peerId: string,
		state: AmongUsState,
		settings: ISettings,
		lobbySettings: ILobbySettings,
		me: Player,
		other: Player,
		impostorRadioClientId: number
	): number | null {
		const peer = this.peers.get(peerId);
		const destination = this.masterGain;
		if (!peer || !destination) return null;

		const { pan, gain, muffle, reverb } = peer;
		const result = calculateVoiceAudio({
			state,
			settings,
			lobbySettings,
			me,
			other,
			maxDistance: this.maxDistance,
			impostorRadioClientId,
		});

		if (result.panMaxDistance !== null) {
			pan.maxDistance = result.panMaxDistance;
		}

		if (result.reverb === true) {
			if (!peer.reverbConnected) {
				peer.reverbConnected = true;
				connectEffect(gain, reverb, destination);
			}
		} else if (result.reverb === false && peer.reverbConnected) {
			peer.reverbConnected = false;
			disconnectEffect(gain, reverb, destination);
		}

		if (result.muffle) {
			muffle.type = result.muffle.type;
			muffle.frequency.value = result.muffle.frequency;
			muffle.Q.value = result.muffle.q;
			if (!peer.muffleConnected) {
				peer.muffleConnected = true;
				connectEffect(gain, muffle, destination);
			}
		} else if (result.muffle === false && peer.muffleConnected) {
			peer.muffleConnected = false;
			disconnectEffect(gain, muffle, destination);
		}

		if (result.panPosition) {
			const time = pan.context.currentTime;
			pan.positionX.setValueAtTime(result.panPosition[0], time);
			pan.positionY.setValueAtTime(result.panPosition[1], time);
			pan.positionZ.setValueAtTime(-0.5, time);
		}

		return result.gain;
	}
}

function connectEffect(gain: AudioNode, effect: AudioNode, destination: AudioNode): void {
	try {
		gain.disconnect(destination);
		gain.connect(effect);
		effect.connect(destination);
	} catch (error) {
		console.warn('Failed to apply audio effect', error);
	}
}

function disconnectEffect(gain: AudioNode, effect: AudioNode, destination: AudioNode): void {
	try {
		effect.disconnect(destination);
		gain.disconnect(effect);
		gain.connect(destination);
	} catch (error) {
		console.warn('Failed to restore audio effect', error);
	}
}
