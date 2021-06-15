import { GamePlatform } from './GamePlatform';

export interface ISettings {
	alwaysOnTop: boolean;
	language: string;
	microphone: string;
	speaker: string;
	pushToTalkMode: number;
	serverURL: string;
	pushToTalkShortcut: string;
	deafenShortcut: string;
	muteShortcut: string;
	impostorRadioShortcut: string;
	hideCode: boolean;
	natFix: boolean;
	compactOverlay: boolean;
	overlayPosition: string;
	enableOverlay: boolean;
	meetingOverlay: boolean;

	localLobbySettings: ILobbySettings;
	ghostVolume: number;
	masterVolume: number;
	microphoneGain: number;
	microphoneGainEnabled: boolean;
	micSensitivity: number;
	micSensitivityEnabled: boolean;
	mobileHost: boolean;
	vadEnabled: boolean;
	hardware_acceleration: boolean;
	echoCancellation: boolean;
	noiseSuppression: boolean;
	enableSpatialAudio: boolean;
	playerConfigMap: playerConfigMap;
	obsOverlay: boolean;
	obsSecret: string | undefined;

	launchPlatform: GamePlatform;
}

export interface ILobbySettings {
	maxDistance: number;
	visionHearing: boolean;
	haunting: boolean;
	hearImpostorsInVents: boolean;
	impostersHearImpostersInvent: boolean;
	impostorRadioEnabled: boolean;
	commsSabotage: boolean;
	deadOnly: boolean;
	meetingGhostOnly: boolean;
	hearThroughCameras: boolean;
	wallsBlockAudio: boolean;
	publicLobby_on: boolean;
	publicLobby_title: string;
	publicLobby_language: string;
	publicLobby_mods: MODS;
}

export interface SocketConfig {
	volume: number;
	isMuted: boolean;
}

export interface playerConfigMap {
	[socketId: number]: SocketConfig;
}
