import { Player, AmongUsState } from '../../common/AmongUsState';
import { ISettings, ILobbySettings } from '../../common/ISettings';
import { IpcRendererMessages } from '../../common/ipc-messages';
import { pushToTalkOptions } from '../../common/pushToTalkOptions';
import { ipcRenderer } from '../lib/electron-bridge';
import { TypedEmitter } from '../lib/TypedEmitter';
import VAD from '../lib/vad';
import SettingsStore from '../settings/SettingsStore';
import { calculateVoiceAudio } from './spatialAudio';
import { ExtendedAudioElement, LegacyAudioConstraints, PeerAudioNodes, VadNode } from './types';

interface AudioControllerEvents extends Record<string, unknown[]> {
	talking: [boolean];
	muteStateChanged: [muted: boolean, deafened: boolean];
	peerAudioReady: [peerId: string];
	error: [string];
}

const REVERB_URL = import.meta.env.DEV
	? `${window.location.origin}/sounds/reverb.ogx`
	: 'app://bundle/sounds/reverb.ogx';

const GAIN_RAMP_SECONDS = 0.02;

function rampGain(node: GainNode, target: number): void {
	const param = node.gain;
	const current = param.value;
	if (current === target) return;
	const now = node.context.currentTime;
	param.cancelScheduledValues(now);
	param.setValueAtTime(current, now);
	param.linearRampToValueAtTime(target, now + GAIN_RAMP_SECONDS);
}

export class AudioController extends TypedEmitter<AudioControllerEvents> {
	private started = false;
	private startToken = 0;
	private inputStream?: MediaStream;
	private stream?: MediaStream;
	private context?: AudioContext;
	private masterGain?: GainNode;
	private masterDestination?: MediaStreamAudioDestinationNode;
	private masterElement?: ExtendedAudioElement;
	private useContextSink = false;
	private microphoneGain?: GainNode;
	private inputSource?: MediaStreamAudioSourceNode;
	private inputDestination?: MediaStreamAudioDestinationNode;
	private audioListener?: VadNode;
	private convolverBuffer: AudioBuffer | null = null;
	private peers = new Map<string, PeerAudioNodes>();
	private ipcHandlers: [string, (...args: unknown[]) => void][] = [];

	private pushToTalkMode: number = pushToTalkOptions.VOICE;
	private pushToTalkPressed = false;
	private radioTransmitting = false;
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
		const token = ++this.startToken;

		const settings = SettingsStore.store;
		this.pushToTalkMode = settings.pushToTalkMode;

		const context = new AudioContext();
		this.context = context;
		void context.resume().catch(() => {
			/* resumed on first user gesture instead */
		});
		this.createOutputBus(settings.speaker);
		void this.loadConvolverBuffer();

		try {
			await this.createInputChain(settings, token);
		} catch (error) {
			if (token === this.startToken) {
				this.started = false;
				this.teardownGraph();
			}
			throw error;
		}

		if (token !== this.startToken) return;
		if (!this.started) {
			this.teardownInputChain();
			this.teardownGraph();
			return;
		}

		this.applyTrackEnabled();
		this.registerHotkeys();
	}

	async restartInput(): Promise<MediaStreamTrack | undefined> {
		if (!this.started || !this.context) return undefined;
		const token = this.startToken;

		this.teardownInputChain();
		try {
			await this.createInputChain(SettingsStore.store, token);
		} catch {
			return undefined;
		}
		if (token !== this.startToken) return undefined;
		if (!this.started) {
			this.teardownInputChain();
			return undefined;
		}

		this.applyTrackEnabled();
		return this.stream?.getAudioTracks()[0];
	}

	private async createInputChain(settings: ISettings, token: number): Promise<void> {
		const context = this.context;
		if (!context) return;

		const constraints: LegacyAudioConstraints = {
			deviceId: undefined,
			autoGainControl: settings.autoGainControl,
			channelCount: 2,
			echoCancellation: settings.echoCancellation,
			latency: 0,
			noiseSuppression: settings.noiseSuppression,
			googNoiseSuppression: settings.noiseSuppression,
			googEchoCancellation: settings.echoCancellation,
			googTypingNoiseDetection: settings.noiseSuppression,
			sampleRate: settings.oldSampleDebug ? 48000 : undefined,
		};
		if (settings.microphone.toLowerCase() !== 'default') {
			constraints.deviceId = settings.microphone;
		}

		let inputStream: MediaStream;
		try {
			inputStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: constraints });
		} catch (error) {
			this.emit('error', "Couldn't connect to your microphone:\n" + error);
			throw error;
		}

		if (!this.started || token !== this.startToken) {
			inputStream.getTracks().forEach((track) => track.stop());
			return;
		}

		this.inputStream = inputStream;
		this.stream = inputStream;

		const source = context.createMediaStreamSource(inputStream);
		this.inputSource = source;

		if ((settings.microphoneGainEnabled || settings.micSensitivityEnabled) && !settings.autoGainControl) {
			const microphoneGain = context.createGain();
			const destination = context.createMediaStreamDestination();
			source.connect(microphoneGain);
			microphoneGain.gain.value = settings.microphoneGainEnabled ? settings.microphoneGain / 100 : 1;
			microphoneGain.connect(destination);
			this.microphoneGain = microphoneGain;
			this.inputDestination = destination;
			this.stream = destination.stream;
		}

		const audioListener = VAD(context, source, undefined, {
			onVoiceStart: () => {
				const current = SettingsStore.store;
				if (this.microphoneGain && current.micSensitivityEnabled && !current.autoGainControl) {
					this.microphoneGain.gain.value = current.microphoneGainEnabled ? current.microphoneGain / 100 : 1;
				}
				this.emit('talking', true);
			},
			onVoiceStop: () => {
				if (this.microphoneGain && SettingsStore.store.micSensitivityEnabled && !SettingsStore.store.autoGainControl) {
					this.microphoneGain.gain.value = 0;
				}
				this.emit('talking', false);
			},
			noiseCaptureDuration: 0,
			stereo: false,
		}) as VadNode;

		audioListener.options.minNoiseLevel =
			settings.micSensitivityEnabled && !settings.autoGainControl ? settings.micSensitivity : 0.15;
		audioListener.options.maxNoiseLevel = 1;
		audioListener.init();
		this.audioListener = audioListener;
	}

	private teardownInputChain(): void {
		this.audioListener?.destroy();
		this.audioListener = undefined;

		this.inputSource?.disconnect();
		this.inputSource = undefined;

		this.microphoneGain?.disconnect();
		this.microphoneGain = undefined;

		this.inputDestination?.disconnect();
		this.inputDestination = undefined;

		this.inputStream?.getTracks().forEach((track) => track.stop());
		this.inputStream = undefined;
		this.stream = undefined;
	}

	stop(): void {
		this.startToken++;
		if (!this.started) {
			this.removeAllListeners();
			return;
		}
		this.started = false;

		this.unregisterHotkeys();

		for (const peerId of Array.from(this.peers.keys())) {
			this.removePeer(peerId);
		}

		this.teardownInputChain();
		this.teardownGraph();

		this.mutedState = false;
		this.deafenedState = false;
		this.pushToTalkPressed = false;
		this.radioTransmitting = false;
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
			this.pushToTalkPressed = pressing;
			this.applyTrackEnabled();
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
		if (this.deafenedState || this.mutedState) {
			track.enabled = false;
			return;
		}
		if (this.radioTransmitting) {
			track.enabled = true;
			return;
		}
		if (this.pushToTalkMode === pushToTalkOptions.PUSH_TO_TALK) {
			track.enabled = this.pushToTalkPressed;
			return;
		}
		track.enabled = this.pushToTalkMode !== pushToTalkOptions.PUSH_TO_MUTE || !this.pushToTalkPressed;
	}

	setPushToTalkMode(mode: number): void {
		this.pushToTalkMode = mode;
		this.applyTrackEnabled();
	}

	setRadioTransmitting(transmitting: boolean): void {
		this.radioTransmitting = transmitting;
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
		if (settings.autoGainControl) return;
		if (!settings.microphoneGainEnabled && !settings.micSensitivityEnabled) return;

		if (!settings.micSensitivityEnabled) {
			this.microphoneGain.gain.value = settings.microphoneGainEnabled ? settings.microphoneGain / 100 : 1;
		}
		if (this.audioListener?.options) {
			this.audioListener.options.minNoiseLevel = settings.micSensitivityEnabled ? settings.micSensitivity : 0.15;
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
		if (this.peers.get(peerId)?.stream === stream) return;
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
			stream,
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
			rampGain(peer.gain, 0);
		}
	}

	silencePeersExcept(peerIds: string[]): void {
		for (const [peerId, peer] of this.peers) {
			if (!peerIds.includes(peerId)) {
				rampGain(peer.gain, 0);
			}
		}
	}

	setPeerGain(peerId: string, gain: number): void {
		const peer = this.peers.get(peerId);
		if (peer) rampGain(peer.gain, gain);
	}

	/**
	 * Returns the pre-volume gain for the peer, or `null` when the peer has no audio graph yet.
	 */
	applyVoiceAudio(
		peerId: string,
		state: AmongUsState,
		settings: ISettings,
		activeLobbySettings: ILobbySettings,
		me: Player,
		other: Player,
		impostorRadioClientId: number
	): number | null {
		const peer = this.peers.get(peerId);
		const destination = this.masterGain;
		if (!peer || !destination) return null;

		const { pan, muffle } = peer;
		const result = calculateVoiceAudio({
			state,
			settings,
			activeLobbySettings,
			me,
			other,
			maxDistance: this.maxDistance,
			impostorRadioClientId,
		});

		if (result.panMaxDistance !== null) {
			pan.maxDistance = result.panMaxDistance;
		}

		if (result.muffle) {
			muffle.type = result.muffle.type;
			muffle.frequency.value = result.muffle.frequency;
			muffle.Q.value = result.muffle.q;
		}

		const wantReverb = result.reverb === null ? peer.reverbConnected : result.reverb;
		const wantMuffle = result.muffle === null ? peer.muffleConnected : result.muffle !== false;
		rebuildEffectChain(peer, destination, wantReverb, wantMuffle);

		if (result.panPosition) {
			const time = pan.context.currentTime;
			pan.positionX.setValueAtTime(result.panPosition[0], time);
			pan.positionY.setValueAtTime(result.panPosition[1], time);
			pan.positionZ.setValueAtTime(-0.5, time);
		}

		return result.gain;
	}
}

function rebuildEffectChain(
	peer: PeerAudioNodes,
	destination: AudioNode,
	wantReverb: boolean,
	wantMuffle: boolean
): void {
	if (peer.reverbConnected === wantReverb && peer.muffleConnected === wantMuffle) return;

	for (const node of [peer.gain, peer.muffle, peer.reverb]) {
		try {
			node.disconnect();
		} catch {
			/* not connected */
		}
	}

	const chain: AudioNode[] = [peer.gain];
	if (wantMuffle) chain.push(peer.muffle);
	if (wantReverb) chain.push(peer.reverb);
	chain.push(destination);

	try {
		for (let index = 0; index < chain.length - 1; index++) {
			chain[index].connect(chain[index + 1]);
		}
		peer.reverbConnected = wantReverb;
		peer.muffleConnected = wantMuffle;
	} catch (error) {
		console.warn('Failed to rebuild audio effect chain', error);
		peer.reverbConnected = false;
		peer.muffleConnected = false;
		try {
			peer.gain.connect(destination);
		} catch {
			/* destination already gone */
		}
	}
}
