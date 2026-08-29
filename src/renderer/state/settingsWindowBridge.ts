import { ILobbySettings } from '../../common/ISettings';
import { IpcMessages, IpcSettingsMessages } from '../../common/ipc-messages';
import { ipcRenderer } from '../lib/electron-bridge';
import { voiceController } from '../voice/useVoiceController';
import { gameStore } from './gameStore';

let started = false;
let unsubscribeGameStore: (() => void) | undefined;
let unsubscribeVoice: (() => void) | undefined;
let lastSentGameState: unknown;
let lastSentActiveLobbySettings: ILobbySettings | null | undefined;
let lastSentHostId: number | undefined;

function sendGameState(): void {
	const { gameState } = gameStore.getSnapshot();
	lastSentGameState = gameState;
	ipcRenderer.send(IpcMessages.SEND_TO_SETTINGS, IpcSettingsMessages.NOTIFY_GAME_STATE_CHANGED, gameState);
}

function sendActiveLobbySettings(): void {
	const { activeLobbySettings } = voiceController.getSnapshot();
	lastSentActiveLobbySettings = activeLobbySettings;
	ipcRenderer.send(
		IpcMessages.SEND_TO_SETTINGS,
		IpcSettingsMessages.NOTIFY_ACTIVE_LOBBY_SETTINGS_CHANGED,
		activeLobbySettings
	);
}

function sendHostId(): void {
	const { hostId } = voiceController.getSnapshot();
	lastSentHostId = hostId;
	ipcRenderer.send(IpcMessages.SEND_TO_SETTINGS, IpcSettingsMessages.NOTIFY_HOST_ID_CHANGED, hostId);
}

function sendAll(): void {
	sendGameState();
	sendActiveLobbySettings();
	sendHostId();
}

function onGameStoreChanged(): void {
	if (gameStore.getSnapshot().gameState !== lastSentGameState) sendGameState();
}

function onVoiceChanged(): void {
	const { activeLobbySettings, hostId } = voiceController.getSnapshot();
	if (activeLobbySettings !== lastSentActiveLobbySettings) sendActiveLobbySettings();
	if (hostId !== lastSentHostId) sendHostId();
}

export function startSettingsWindowBridge(): void {
	if (started) return;
	started = true;

	unsubscribeGameStore = gameStore.subscribe(onGameStoreChanged);
	unsubscribeVoice = voiceController.subscribe(onVoiceChanged);
	ipcRenderer.on(IpcSettingsMessages.REQUEST_INITVALUES, sendAll);
	sendAll();
}

export function stopSettingsWindowBridge(): void {
	if (!started) return;
	started = false;
	unsubscribeGameStore?.();
	unsubscribeGameStore = undefined;
	unsubscribeVoice?.();
	unsubscribeVoice = undefined;
	ipcRenderer.off(IpcSettingsMessages.REQUEST_INITVALUES, sendAll);
}
