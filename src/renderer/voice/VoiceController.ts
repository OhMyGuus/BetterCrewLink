import { AmongUsState, ClientBoolMap, GameState, Player } from '../../common/AmongUsState';
import { MapType } from '../../common/AmongusMap';
import { GameInfo } from '../../common/GameInfo';
import { ILobbySettings, ISettings, playerConfigMap } from '../../common/ISettings';
import { IpcMessages, IpcOverlayMessages, IpcRendererMessages } from '../../common/ipc-messages';
import { ObsVoiceState } from '../../common/ObsOverlay';
import { VoiceState } from '../../common/AmongUsState';
import { ipcRenderer } from '../lib/electron-bridge';
import { TypedEmitter } from '../lib/TypedEmitter';
import SettingsStore from '../settings/SettingsStore';
import { gameStore } from '../state/gameStore';
import { AudioController } from './AudioController';
import { ConnectionController } from './ConnectionController';
import { clampGracePeriod, defaultLobbySettings, ExtendedAudioElement, VoiceSnapshot } from './types';
// @ts-ignore
import radioOnSound from '../../../static/sounds/radio_on.wav';
// @ts-ignore
import radioOffSound from '../../../static/sounds/radio_beep2.wav';
// @ts-ignore
import muteCueSound from '../../../static/sounds/radio_beep1.wav';

interface HostInfo {
	map: MapType;
	gamestate: GameState;
	code: string;
	hostId: number;
	parsedHostId: number;
	isHost: boolean;
	serverHostId: number;
}

interface VoiceControllerEvents extends Record<string, unknown[]> {
	change: [];
}

function cueAudio(src: string, volume: number, rate = 1): ExtendedAudioElement {
	const audio = new Audio() as ExtendedAudioElement & { preservesPitch?: boolean };
	audio.src = src;
	audio.volume = volume;
	audio.preservesPitch = false;
	audio.playbackRate = rate;
	return audio;
}

function playCue(audio: ExtendedAudioElement): void {
	audio.currentTime = 0;
	void audio.play().catch(() => undefined);
}

const radioOnAudio = cueAudio(radioOnSound, 0.02);
const radioOffAudio = cueAudio(radioOffSound, 0.09);
const mutedAudio = cueAudio(muteCueSound, 0.1, 0.8);
const unmutedAudio = cueAudio(muteCueSound, 0.1, 1.3);
const deafenedAudio = cueAudio(radioOffSound, 0.1, 0.8);
const undeafenedAudio = cueAudio(radioOffSound, 0.1, 1.3);

const cueAudios: ExtendedAudioElement[] = [
	radioOnAudio,
	radioOffAudio,
	mutedAudio,
	unmutedAudio,
	deafenedAudio,
	undeafenedAudio,
];

function setCueSink(speaker: string): void {
	const sinkId = !speaker || speaker.toLowerCase() === 'default' ? '' : speaker;
	for (const audio of cueAudios) {
		void audio.setSinkId?.(sinkId)?.catch(() => undefined);
	}
}

const OVERLAY_VOICE_KEYS: (keyof VoiceSnapshot)[] = [
	'otherTalking',
	'otherDead',
	'socketClients',
	'playerSocketIds',
	'audioConnected',
	'talking',
	'muted',
	'deafened',
	'impostorRadioClientId',
];

const EMPTY_SNAPSHOT: VoiceSnapshot = {
	connected: false,
	error: '',
	talking: false,
	muted: false,
	deafened: false,
	otherTalking: {},
	otherDead: {},
	socketClients: {},
	playerSocketIds: {},
	audioConnected: {},
	impostorRadioClientId: -1,
	activeLobbySettings: null,
	hostId: 0,
};

function emptyHost(): HostInfo {
	return {
		map: MapType.UNKNOWN,
		gamestate: GameState.UNKNOWN,
		code: 'MENU',
		hostId: 0,
		parsedHostId: 0,
		isHost: false,
		serverHostId: 0,
	};
}

function emptyPrev() {
	return {
		lobbyCode: '',
		gameState: GameState.UNKNOWN,
		isHost: false,
		playerId: -1,
		clientId: -1,
		playerName: '',
		vadHidden: false,
		playerCount: -1,
		publicLobbyTitle: '',
		publicLobbyLanguage: '',
		publicLobbyOn: false,
		publicLobbyGameState: GameState.UNKNOWN,
		pushToTalkMode: -1,
		microphoneGain: -1,
		micSensitivity: -1,
		speaker: '',
		inputSignature: '',
		serverURL: '',
		myLobbySettings: null as ILobbySettings | null,
		lobbySettingsLobby: null as string | null,
		lobbySettingsHosted: false,
		gameOpen: false,
		gameInfo: '',
		obsPayload: '',
	};
}

export class VoiceController extends TypedEmitter<VoiceControllerEvents> {
	private readonly audio = new AudioController();
	private readonly connection = new ConnectionController();

	private started = false;
	private startToken = 0;
	private snapshot: VoiceSnapshot = EMPTY_SNAPSHOT;
	private unsubscribers: (() => void)[] = [];
	private audioUnsubscribers: (() => void)[] = [];
	private connectionUnsubscribers: (() => void)[] = [];

	private otherVAD: ClientBoolMap = {};
	private localTalking = false;
	private playerConfigs: playerConfigMap = {};
	private impostorRadioPressed = false;
	private radioTransmitting = false;
	private cueMuted = false;
	private cueDeafened = false;
	/** Wall-clock deadline of the running grace period; 0 when none is running. */
	private gracePeriodEndsAt = 0;

	private host: HostInfo = emptyHost();

	private prev = emptyPrev();

	private get activeLobbySettings(): ILobbySettings {
		return this.snapshot.activeLobbySettings ?? defaultLobbySettings;
	}

	getSnapshot = (): VoiceSnapshot => this.snapshot;

	subscribe = (listener: () => void): (() => void) => this.on('change', listener);

	get running(): boolean {
		return this.started;
	}

	async start(): Promise<void> {
		if (this.started) return;
		this.started = true;
		const token = ++this.startToken;

		const settings = SettingsStore.store;
		this.playerConfigs = settings.playerConfigMap;
		this.prev.pushToTalkMode = settings.pushToTalkMode;
		this.prev.microphoneGain = settings.microphoneGain;
		this.prev.micSensitivity = settings.micSensitivity;
		this.prev.speaker = settings.speaker;
		setCueSink(settings.speaker);
		this.prev.inputSignature = VoiceController.inputSignature(settings);
		this.prev.serverURL = settings.serverURL;
		this.prev.myLobbySettings = settings.myLobbySettings;
		this.patch({ activeLobbySettings: settings.myLobbySettings ?? defaultLobbySettings, error: '' });

		this.wireAudio();
		this.wireConnection();

		try {
			await this.audio.start();
		} catch {
			if (token === this.startToken) this.teardown(true);
			return;
		}
		if (!this.started || token !== this.startToken) return;

		const stream = this.audio.outboundStream;
		if (!stream) {
			this.teardown(true);
			return;
		}

		this.connection.start(settings.serverURL, stream);

		this.unsubscribers.push(gameStore.subscribe(() => this.onGameStore()));
		const onSettings = (next: ISettings) => this.onSettings(next);
		SettingsStore.onDidAnyChange(onSettings);
		this.unsubscribers.push(() => SettingsStore.offDidAnyChange(onSettings));

		ipcRenderer.on(IpcRendererMessages.IMPOSTOR_RADIO, this.onImpostorRadioKey);
		this.unsubscribers.push(() => ipcRenderer.off(IpcRendererMessages.IMPOSTOR_RADIO, this.onImpostorRadioKey));

		this.onGameStore();
	}

	stop(): void {
		if (!this.started) return;
		this.teardown();
	}

	private teardown(preserveError = false): void {
		this.started = false;
		this.startToken++;
		const lastError = this.snapshot.error;

		for (const unsubscribe of this.unsubscribers) unsubscribe();
		this.unsubscribers = [];

		this.connection.stop();
		this.audio.stop();
		this.unwireConnection();
		this.unwireAudio();

		this.otherVAD = {};
		this.localTalking = false;
		this.impostorRadioPressed = false;
		this.radioTransmitting = false;
		this.playerConfigs = {};
		this.host = emptyHost();
		this.prev = emptyPrev();
		this.snapshot = preserveError && lastError ? { ...EMPTY_SNAPSHOT, error: lastError } : EMPTY_SNAPSHOT;
		this.emit('change');
	}

	toggleMute = (): void => this.audio.toggleMute();

	toggleDeafen = (): void => this.audio.toggleDeafen();

	private onImpostorRadioKey = (_: unknown, pressing: boolean): void => {
		this.setImpostorRadio(pressing);
	};

	setImpostorRadio(pressing: boolean): void {
		this.impostorRadioPressed = pressing;
		this.applyImpostorRadio();
	}

	private patch(partial: Partial<VoiceSnapshot>): void {
		let changed = false;
		for (const key of Object.keys(partial) as (keyof VoiceSnapshot)[]) {
			if (this.snapshot[key] !== partial[key]) {
				changed = true;
				break;
			}
		}
		if (!changed) return;
		this.snapshot = { ...this.snapshot, ...partial };
		this.emit('change');

		if (Object.keys(partial).some((key) => OVERLAY_VOICE_KEYS.includes(key as keyof VoiceSnapshot))) {
			this.publishOverlayVoiceState();
		}
	}

	private unwireAudio(): void {
		for (const unsubscribe of this.audioUnsubscribers) unsubscribe();
		this.audioUnsubscribers = [];
	}

	private unwireConnection(): void {
		for (const unsubscribe of this.connectionUnsubscribers) unsubscribe();
		this.connectionUnsubscribers = [];
	}

	private wireAudio(): void {
		this.unwireAudio();
		const add = this.audioUnsubscribers.push.bind(this.audioUnsubscribers);

		add(
			this.audio.on('talking', (talking) => {
				this.localTalking = talking;
				this.patch({ talking });
				if (!this.prev.vadHidden || !talking) {
					this.connection.emitVad(talking);
				}
			})
		);

		add(
			this.audio.on('muteStateChanged', (muted, deafened) => {
				this.playMuteCue(muted, deafened);
				this.patch({ muted, deafened });
			})
		);

		add(
			this.audio.on('peerAudioReady', (peerId) => {
				this.patch({ audioConnected: { ...this.snapshot.audioConnected, [peerId]: true } });
			})
		);

		add(this.audio.on('error', (error) => this.patch({ error })));
	}

	private wireConnection(): void {
		this.unwireConnection();
		const add = this.connectionUnsubscribers.push.bind(this.connectionUnsubscribers);

		add(
			this.connection.on('connected', () => {
				this.patch({ connected: true });
				this.syncLobbyConnection(true);
				void this.publishGameInfo();
			})
		);

		add(
			this.connection.on('disconnected', () => {
				this.prev.gameInfo = '';
				this.patch({ connected: false });
			})
		);

		add(this.connection.on('error', (error) => this.patch({ error })));

		add(
			this.connection.on('serverHost', (hostId) => {
				this.host.serverHostId = hostId;
			})
		);

		add(
			this.connection.on('socketClients', (clients) => {
				this.patch({ socketClients: clients, playerSocketIds: this.connection.playerSocketIds });
			})
		);

		add(
			this.connection.on('vad', (clientId, activity) => {
				this.otherVAD = { ...this.otherVAD, [clientId]: activity };
			})
		);

		add(this.connection.on('peerStream', (peerId, stream) => this.audio.addPeer(peerId, stream)));

		add(
			this.connection.on('peerClosed', (peerId) => {
				this.audio.removePeer(peerId);
				const audioConnected = { ...this.snapshot.audioConnected };
				delete audioConnected[peerId];
				this.patch({ audioConnected });
			})
		);

		add(
			this.connection.on('lobbyReset', () => {
				this.otherVAD = {};
				this.patch({ otherTalking: {} });
			})
		);

		add(this.connection.on('peerData', (peerId, data) => this.onPeerData(peerId, data)));
	}

	private onPeerData(peerId: string, data: Record<string, unknown>): void {
		if (Object.prototype.hasOwnProperty.call(data, 'impostorRadio')) {
			const clientId = this.connection.getClient(peerId)?.clientId;
			const current = this.snapshot.impostorRadioClientId;
			if (clientId !== undefined) {
				if (current === -1 && data.impostorRadio) {
					this.patch({ impostorRadioClientId: clientId });
				} else if (current === clientId && !data.impostorRadio) {
					this.patch({ impostorRadioClientId: -1 });
				}
			}
		}

		if (Object.prototype.hasOwnProperty.call(data, 'maxDistance')) {
			if (this.host.parsedHostId !== this.connection.getClient(peerId)?.clientId) return;
			const received = { ...defaultLobbySettings, ...data } as ILobbySettings;
			received.gracePeriod = clampGracePeriod(received.gracePeriod);
			this.patch({ activeLobbySettings: received });
		}
	}

	private playMuteCue(muted: boolean, deafened: boolean): void {
		const changedDeafen = deafened !== this.cueDeafened;
		const changedMute = muted !== this.cueMuted;
		this.cueMuted = muted;
		this.cueDeafened = deafened;
		if (!SettingsStore.store.muteCueSounds) return;
		let cue: ExtendedAudioElement | undefined;
		if (changedDeafen) cue = deafened ? deafenedAudio : undeafenedAudio;
		else if (changedMute) cue = muted ? mutedAudio : unmutedAudio;
		if (!cue) return;
		playCue(cue);
	}

	private static inputSignature(settings: ISettings): string {
		return [
			settings.microphone,
			settings.echoCancellation,
			settings.noiseSuppression,
			settings.autoGainControl,
			settings.oldSampleDebug,
			settings.microphoneGainEnabled,
			settings.micSensitivityEnabled,
		].join('|');
	}

	private reconnectToServer(serverURL: string): void {
		const stream = this.audio.outboundStream;
		if (!stream) return;
		this.connection.stop();
		this.wireConnection();
		this.connection.start(serverURL, stream);
	}

	private async rebuildAudioInput(): Promise<void> {
		const track = await this.audio.restartInput();
		if (!track || !this.started) return;
		this.connection.replaceOutboundTrack(track);
	}

	private onSettings(settings: ISettings): void {
		this.playerConfigs = settings.playerConfigMap;

		const inputSignature = VoiceController.inputSignature(settings);
		if (inputSignature !== this.prev.inputSignature) {
			this.prev.inputSignature = inputSignature;
			void this.rebuildAudioInput();
		}

		if (settings.serverURL !== this.prev.serverURL) {
			this.prev.serverURL = settings.serverURL;
			this.reconnectToServer(settings.serverURL);
		}

		if (settings.pushToTalkMode !== this.prev.pushToTalkMode) {
			this.prev.pushToTalkMode = settings.pushToTalkMode;
			this.audio.setPushToTalkMode(settings.pushToTalkMode);
		}

		if (settings.speaker !== this.prev.speaker) {
			this.prev.speaker = settings.speaker;
			this.audio.setSpeaker(settings.speaker);
			setCueSink(settings.speaker);
		}

		if (settings.microphoneGain !== this.prev.microphoneGain || settings.micSensitivity !== this.prev.micSensitivity) {
			this.prev.microphoneGain = settings.microphoneGain;
			this.prev.micSensitivity = settings.micSensitivity;
			this.audio.updateMicrophoneSettings(settings);
		}

		if (settings.myLobbySettings !== this.prev.myLobbySettings) {
			this.prev.myLobbySettings = settings.myLobbySettings;
			if (this.host.isHost) {
				this.connection.broadcast(JSON.stringify(settings.myLobbySettings));
				this.patch({ activeLobbySettings: settings.myLobbySettings });
			}
		}
	}

	private onGameState(state: AmongUsState): void {
		if (!state) return;
		const myPlayer = state.players?.find((player) => player.isLocal);

		if (state.players && myPlayer) {
			this.host = {
				map: state.map,
				gamestate: state.gameState,
				code: state.lobbyCode,
				hostId: state.hostId,
				isHost: state.hostId > 0 ? state.isHost : this.host.serverHostId === state.clientId,
				parsedHostId: state.hostId > 0 ? state.hostId : this.host.serverHostId,
				serverHostId: this.host.serverHostId,
			};
			this.patch({ hostId: this.host.parsedHostId });
			this.claimLobbySettingsOwnership(state);

			const activeLobbySettings = this.activeLobbySettings;
			let maxDistance = activeLobbySettings.visionHearing
				? myPlayer.isImpostor
					? activeLobbySettings.maxDistance
					: state.lightRadius + 0.5
				: activeLobbySettings.maxDistance;
			if (maxDistance <= 0.6) maxDistance = 1;
			this.audio.setMaxDistance(maxDistance);
		}

		this.connection.setContext({
			isHost: this.host.isHost,
			lobbyCode: state.lobbyCode,
			gameState: state.gameState,
			parsedHostId: this.host.parsedHostId,
			activeLobbySettings: this.activeLobbySettings,
		});

		this.handleHostChange(state);
		this.handleGameStateTransition(state, myPlayer);
		this.handleLobbyConnection(state, myPlayer);
		this.handlePlayerIdentity(state, myPlayer);
		this.handlePublicLobby(state, myPlayer);
		this.cleanupImpostorRadio(state, myPlayer);
		this.applyImpostorRadio();
		this.updatePeerAudio(state, myPlayer);
		this.publishMobileAndObs(state, myPlayer);
	}

	private claimLobbySettingsOwnership(state: AmongUsState): void {
		const lobbyCode = state.lobbyCode ?? 'MENU';
		const joinedOtherLobby = lobbyCode !== this.prev.lobbySettingsLobby;
		const becameHost = this.host.isHost && !this.prev.lobbySettingsHosted;
		this.prev.lobbySettingsLobby = lobbyCode;
		this.prev.lobbySettingsHosted = this.host.isHost;
		if (!joinedOtherLobby && !becameHost) return;

		if (!this.host.isHost) {
			this.patch({ activeLobbySettings: null });
			return;
		}

		const ownSettings = SettingsStore.store.myLobbySettings ?? defaultLobbySettings;
		this.prev.myLobbySettings = ownSettings;
		this.patch({ activeLobbySettings: ownSettings });
		this.connection.broadcast(JSON.stringify(ownSettings));
	}

	private onGameStore(): void {
		const { gameState, gameOpen } = gameStore.getSnapshot();
		if (gameOpen !== this.prev.gameOpen) {
			this.prev.gameOpen = gameOpen;
			if (gameOpen) void this.publishGameInfo();
		}
		this.onGameState(gameState);
	}

	private async publishGameInfo(): Promise<void> {
		if (!this.started || !this.snapshot.connected || !gameStore.getSnapshot().gameOpen) return;

		let gameInfo: GameInfo | null = null;
		try {
			gameInfo = (await ipcRenderer.invoke(IpcMessages.REQUEST_GAME_INFO)) as GameInfo | null;
		} catch (error) {
			console.warn('failed to read game info:', error);
			return;
		}
		if (!this.started || !gameInfo || gameInfo.broadcastVersion < 0) return;

		const signature = JSON.stringify(gameInfo);
		if (signature === this.prev.gameInfo) return;
		this.prev.gameInfo = signature;
		this.connection.sendGameInfo(gameInfo);
	}

	private handleHostChange(state: AmongUsState): void {
		if (state.isHost === this.prev.isHost) return;
		this.prev.isHost = state.isHost;
		if (state.isHost && state.hostId > 0) {
			this.connection.emitSetHost(state.lobbyCode, state.clientId);
			this.host.serverHostId = state.hostId;
		}
	}

	private handleGameStateTransition(state: AmongUsState, myPlayer: Player | undefined): void {
		if (state.gameState === this.prev.gameState) return;
		const previous = this.prev.gameState;
		this.prev.gameState = state.gameState;

		this.updateGracePeriod(state.gameState, previous);

		if (state.gameState === GameState.LOBBY) {
			this.patch({ otherDead: {} });
		} else if (state.gameState !== GameState.TASKS && state.players) {
			const otherDead = { ...this.snapshot.otherDead };
			for (const player of state.players) {
				otherDead[player.clientId] = player.isDead || player.disconnected;
			}
			this.patch({ otherDead });
		}

		if (
			state.lobbyCode &&
			myPlayer?.clientId !== undefined &&
			state.gameState === GameState.LOBBY &&
			(previous === GameState.DISCUSSION || previous === GameState.TASKS)
		) {
			this.connection.setMobileRunning(false);
			this.connection.joinLobby(
				state.lobbyCode,
				myPlayer.clientId,
				state.clientId,
				state.isHost,
				myPlayer.friendCode,
				myPlayer.playerUid,
				myPlayer.playerIdentifier
			);
		} else if (previous !== GameState.UNKNOWN && previous !== GameState.MENU && state.gameState === GameState.MENU) {
			this.connection.setMobileRunning(false);
			this.connection.leaveLobby();
			this.patch({ otherDead: {} });
		}
	}

	private updateGracePeriod(current: GameState, previous: GameState): void {
		if (current === GameState.LOBBY || current === GameState.MENU || current === GameState.UNKNOWN) {
			this.gracePeriodEndsAt = 0;
			return;
		}
		if (current !== GameState.TASKS) return;
		if (previous !== GameState.LOBBY && previous !== GameState.DISCUSSION) return;

		const settings = this.activeLobbySettings;
		if (!settings.meetingGhostOnly || settings.gracePeriod <= 0) return;
		this.gracePeriodEndsAt = Date.now() + settings.gracePeriod * 1000;
	}

	private handleLobbyConnection(state: AmongUsState, myPlayer: Player | undefined): void {
		const lobbyCode = state.lobbyCode ?? 'MENU';
		const playerName = myPlayer?.name ?? '';
		if (lobbyCode === this.prev.lobbyCode && playerName === this.prev.playerName) return;
		this.prev.lobbyCode = lobbyCode;
		this.prev.playerName = playerName;
		this.syncLobbyConnection();
	}

	private syncLobbyConnection(force = false): void {
		const { gameState: state } = gameStore.getSnapshot();
		if (!state) return;
		const myPlayer = state.players?.find((player) => player.isLocal);
		if (force) {
			this.prev.lobbyCode = state.lobbyCode ?? 'MENU';
			this.prev.playerName = myPlayer?.name ?? '';
		}
		this.connection.joinLobby(
			state.lobbyCode ?? 'MENU',
			myPlayer?.id ?? 0,
			state.clientId,
			state.isHost,
			myPlayer?.friendCode,
			myPlayer?.playerUid,
			myPlayer?.playerIdentifier
		);
		this.publishPublicLobby(state, myPlayer);
	}

	private handlePlayerIdentity(state: AmongUsState, myPlayer: Player | undefined): void {
		if (myPlayer && myPlayer.clientId !== undefined) {
			if (myPlayer.id !== this.prev.playerId || myPlayer.clientId !== this.prev.clientId) {
				this.prev.playerId = myPlayer.id;
				this.prev.clientId = myPlayer.clientId;
				this.connection.emitId(
					myPlayer.id,
					state.clientId,
					myPlayer.friendCode,
					myPlayer.playerUid,
					myPlayer.playerIdentifier
				);
			}
		}

		const vadHidden = this.isVadHidden(state, myPlayer);
		if (vadHidden !== this.prev.vadHidden) {
			this.prev.vadHidden = vadHidden;
			if (vadHidden) {
				this.connection.emitVad(false);
				this.patch({ talking: false });
			} else {
				this.connection.emitVad(this.localTalking);
				this.patch({ talking: this.localTalking });
			}
		}
	}

	private isVadHidden(state: AmongUsState, myPlayer: Player | undefined): boolean {
		if (state.gameState === GameState.DISCUSSION) return false;
		return (myPlayer?.shiftedColor ?? -1) !== -1;
	}

	private handlePublicLobby(state: AmongUsState, myPlayer: Player | undefined): void {
		const settings = this.activeLobbySettings;
		const playerCount = state.players?.length ?? -1;
		if (
			state.gameState === this.prev.publicLobbyGameState &&
			playerCount === this.prev.playerCount &&
			settings.publicLobby_title === this.prev.publicLobbyTitle &&
			settings.publicLobby_language === this.prev.publicLobbyLanguage &&
			settings.publicLobby_on === this.prev.publicLobbyOn
		) {
			return;
		}
		this.prev.publicLobbyGameState = state.gameState;
		this.prev.playerCount = playerCount;
		this.prev.publicLobbyTitle = settings.publicLobby_title;
		this.prev.publicLobbyLanguage = settings.publicLobby_language;
		this.prev.publicLobbyOn = settings.publicLobby_on;
		this.publishPublicLobby(state, myPlayer);
	}

	private publishPublicLobby(state: AmongUsState, myPlayer: Player | undefined): void {
		if (!state || !this.host.isHost || !state.lobbyCode || state.gameState === GameState.MENU || !state.players) {
			return;
		}
		const activeLobbySettings = this.activeLobbySettings;
		this.connection.publishLobby(state.lobbyCode, {
			id: -1,
			title: activeLobbySettings.publicLobby_title,
			host: myPlayer?.name ?? '',
			current_players: state.players.length,
			max_players: state.maxPlayers,
			language: activeLobbySettings.publicLobby_language,
			mods: state.mod,
			isPublic: activeLobbySettings.publicLobby_on,
			gameState: state.gameState,
		});
	}

	private applyImpostorRadio(): void {
		const { gameState: state } = gameStore.getSnapshot();
		const myPlayer = state?.players?.find((player) => player.isLocal);
		const current = this.snapshot.impostorRadioClientId;
		const granted =
			this.impostorRadioPressed &&
			state?.gameState === GameState.TASKS &&
			myPlayer !== undefined &&
			myPlayer.isImpostor &&
			!myPlayer.isDead &&
			(current === -1 || current === myPlayer.clientId) &&
			this.activeLobbySettings.impostorRadioEnabled;

		if (granted === this.radioTransmitting) return;
		this.radioTransmitting = granted;
		this.audio.setRadioTransmitting(granted);
		this.patch({ impostorRadioClientId: granted && myPlayer ? myPlayer.clientId : -1 });

		playCue(granted ? radioOnAudio : radioOffAudio);

		const playerSocketIds = this.connection.playerSocketIds;
		const targets = (state?.players ?? [])
			.filter((player) => !player.isLocal && !player.bugged)
			.map((player) => playerSocketIds[player.clientId])
			.filter(Boolean);
		this.connection.sendToPeers(targets, JSON.stringify({ impostorRadio: granted }));
	}

	private cleanupImpostorRadio(state: AmongUsState, myPlayer: Player | undefined): void {
		const current = this.snapshot.impostorRadioClientId;
		if (current === -1) return;

		if (!state.players || !myPlayer || state.gameState !== GameState.TASKS) {
			this.patch({ impostorRadioClientId: -1 });
			return;
		}
		if (current === myPlayer.clientId) return;

		const peerId = this.connection.playerSocketIds[current];
		const stillActive =
			Boolean(peerId) &&
			this.audio.hasPeer(peerId) &&
			state.players.some(
				(player) =>
					!player.isLocal &&
					player.clientId === current &&
					player.isImpostor &&
					!player.isDead &&
					!player.disconnected &&
					!player.bugged
			);

		if (!stillActive) {
			this.patch({ impostorRadioClientId: -1 });
		}
	}

	private updatePeerAudio(state: AmongUsState, myPlayer: Player | undefined): void {
		if (!state.players || !myPlayer) return;

		const settings = SettingsStore.store;
		const activeLobbySettings = this.activeLobbySettings;
		const inGracePeriod = this.gracePeriodEndsAt > Date.now();
		const playerSocketIds = this.connection.playerSocketIds;
		const handledPeerIds: string[] = [];
		const otherTalking = { ...this.snapshot.otherTalking };
		let talkingChanged = false;

		for (const player of state.players) {
			if (player.isLocal || player.clientId === myPlayer.clientId) continue;
			const peerId = playerSocketIds[player.clientId];
			if (!peerId || !this.audio.hasPeer(peerId)) continue;

			handledPeerIds.push(peerId);
			let gain = this.audio.applyVoiceAudio(
				peerId,
				state,
				settings,
				activeLobbySettings,
				myPlayer,
				player,
				this.snapshot.impostorRadioClientId,
				inGracePeriod
			);
			if (gain === null) continue;

			if (this.audio.deafened || this.playerConfigs[player.playerConfigId]?.isMuted) {
				gain = 0;
			}

			if (gain > 0) {
				const playerVolume = this.playerConfigs[player.playerConfigId]?.volume;
				gain = playerVolume === undefined ? gain : gain * playerVolume;
				if (myPlayer.isDead && !player.isDead) {
					gain = gain * (settings.crewVolumeAsGhost / 100);
				}
				gain = gain * (settings.masterVolume / 100);
			}

			this.audio.setPeerGain(peerId, gain);

			const talking = Boolean(this.otherVAD[player.clientId]) && gain > 0;
			if (talking !== otherTalking[player.clientId]) {
				otherTalking[player.clientId] = talking;
				talkingChanged = true;
			}
		}

		this.audio.silencePeersExcept(handledPeerIds);

		if (talkingChanged) {
			this.patch({ otherTalking });
		}
	}

	private publishMobileAndObs(state: AmongUsState, myPlayer: Player | undefined): void {
		const settings = SettingsStore.store;
		if (!state.players) return;
		if (!this.connection.isMobileRunning && !settings.obsOverlay) return;

		if (this.connection.isMobileRunning) {
			this.connection.signalTo(state.lobbyCode + '_mobile', {
				gameState: state,
				lobbySettings: this.activeLobbySettings,
			});
		}

		if (
			!settings.obsOverlay ||
			!settings.obsSecret ||
			settings.obsSecret.length !== 9 ||
			!(
				(state.gameState !== GameState.UNKNOWN && state.gameState !== GameState.MENU) ||
				state.oldGameState !== state.gameState
			)
		) {
			return;
		}

		const { playerColors } = gameStore.getSnapshot();
		const { socketClients, playerSocketIds, otherTalking, otherDead, talking } = this.snapshot;

		const obsVoiceState: ObsVoiceState = {
			overlayState: {
				gameState: state.gameState,
				players: state.players.map((player) => ({
					id: player.id,
					clientId: player.clientId,
					inVent: player.inVent,
					isDead: player.isDead,
					name: player.name,
					colorId: player.colorId,
					hatId: player.hatId,
					petId: player.petId,
					skinId: player.skinId,
					visorId: player.visorId,
					disconnected: player.disconnected,
					isLocal: player.isLocal,
					shiftedColor: player.shiftedColor,
					bugged: player.bugged,
					realColor: playerColors[player.colorId],
					usingRadio: player.clientId === this.snapshot.impostorRadioClientId && myPlayer?.isImpostor,
					connected:
						(playerSocketIds[player.clientId] &&
							socketClients[playerSocketIds[player.clientId]]?.clientId === player.clientId) ||
						false,
				})),
			},
			otherTalking,
			otherDead,
			localTalking: talking,
			localIsAlive: !myPlayer?.isDead,
			mod: state.mod,
			oldMeetingHud: state.oldMeetingHud,
		};

		const payload = JSON.stringify(obsVoiceState);
		if (payload === this.prev.obsPayload) return;
		this.prev.obsPayload = payload;

		this.connection.signalTo(settings.obsSecret, obsVoiceState);
	}

	private publishOverlayVoiceState(): void {
		if (!SettingsStore.store.enableOverlay) return;
		const state = gameStore.getSnapshot().gameState;
		if (!state) return;
		const myPlayer = state.players?.find((player) => player.isLocal);
		const { otherTalking, playerSocketIds, otherDead, socketClients, audioConnected, talking, muted, deafened } =
			this.snapshot;

		ipcRenderer.send(IpcMessages.SEND_TO_OVERLAY, IpcOverlayMessages.NOTIFY_VOICE_STATE_CHANGED, {
			otherTalking,
			playerSocketIds,
			otherDead,
			socketClients,
			audioConnected,
			localTalking: talking,
			localIsAlive: !myPlayer?.isDead,
			impostorRadioClientId: !myPlayer?.isImpostor ? -1 : this.snapshot.impostorRadioClientId,
			muted,
			deafened,
			mod: state.mod,
		} as VoiceState);
	}
}
