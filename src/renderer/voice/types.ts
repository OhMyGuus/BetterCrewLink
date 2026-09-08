import { AudioConnected, ClientBoolMap, SocketClientMap, numberStringMap } from '../../common/AmongUsState';
import { ILobbySettings } from '../../common/ISettings';
import { VADOptions } from '../lib/vad';

export interface ExtendedAudioElement extends HTMLAudioElement {
	setSinkId: (sinkId: string) => Promise<void>;
}

export interface PeerAudioNodes {
	stream: MediaStream;
	dummyAudioElement: HTMLAudioElement;
	gain: GainNode;
	pan: PannerNode;
	reverb: ConvolverNode;
	muffle: BiquadFilterNode;
	source: MediaStreamAudioSourceNode;
	reverbConnected: boolean;
	muffleConnected: boolean;
}

export interface ClientPeerConfig {
	forceRelayOnly: boolean;
	iceServers: RTCIceServer[];
}

export const DEFAULT_ICE_CONFIG: RTCConfiguration = {
	iceTransportPolicy: 'all',
	iceServers: [
		{
			urls: 'stun:stun.l.google.com:19302',
		},
	],
};

export const DEFAULT_ICE_CONFIG_TURN: RTCConfiguration = {
	iceTransportPolicy: 'relay',
	iceServers: [
		{
			urls: 'turn:turn.bettercrewl.ink:3478',
			username: 'M9DRVaByiujoXeuYAAAG',
			credential: 'TpHR9HQNZ8taxjb3',
		},
	],
};

export const defaultLobbySettings: ILobbySettings = {
	maxDistance: 5.32,
	haunting: false,
	hearImpostorsInVents: false,
	impostersHearImpostersInvent: false,
	impostorRadioEnabled: false,
	impostorRadioPrivate: false,
	commsSabotage: false,
	deadOnly: false,
	hearThroughCameras: false,
	wallsBlockAudio: false,
	meetingGhostOnly: false,
	ghostsCanTalkIngame: false,
	gracePeriod: 0,
	visionHearing: false,
	publicLobby_on: false,
	publicLobby_title: '',
	publicLobby_language: 'en',
};

export const GRACE_PERIOD_MIN = 0;
export const GRACE_PERIOD_MAX = 10;
export const GRACE_PERIOD_STEP = 0.5;

export function clampGracePeriod(value: unknown): number {
	const seconds = Number(value);
	if (!Number.isFinite(seconds)) return GRACE_PERIOD_MIN;
	return Math.min(Math.max(seconds, GRACE_PERIOD_MIN), GRACE_PERIOD_MAX);
}

export interface VoiceSnapshot {
	connected: boolean;
	error: string;
	talking: boolean;
	muted: boolean;
	deafened: boolean;
	otherTalking: ClientBoolMap;
	otherDead: ClientBoolMap;
	socketClients: SocketClientMap;
	playerSocketIds: numberStringMap;
	audioConnected: AudioConnected;
	impostorRadioClientId: number;
	activeLobbySettings: ILobbySettings | null;
	hostId: number;
}

export interface VadNode {
	connect: () => void;
	destroy: () => void;
	options: VADOptions;
	init: () => void;
}

export interface LegacyAudioConstraints extends MediaTrackConstraints {
	latency?: ConstrainDouble;
	googEchoCancellation?: boolean;
	googNoiseSuppression?: boolean;
	googTypingNoiseDetection?: boolean;
}
