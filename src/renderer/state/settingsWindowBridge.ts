import { ILobbySettings } from '../../common/ISettings';
import { IpcMessages, IpcSettingsMessages } from '../../common/ipc-messages';
import { ipcRenderer } from '../lib/electron-bridge';
import { voiceController } from '../voice/useVoiceController';
import { gameStore } from './gameStore';

let started = false;
let unsubscribeGameStore: (() => void) | undefined;
let unsubscribeVoice: (() => void) | undefined;
let lastSentGameState: unknown;
let lastSentLobbySettings: ILobbySettings | null | undefined;

function sendGameState(): void {
	const { gameState } = gameStore.getSnapshot();
	lastSentGameState = gameState;
	ipcRenderer.send(IpcMessages.SEND_TO_SETTINGS, IpcSettingsMessages.NOTIFY_GAME_STATE_CHANGED, gameState);
}

function sendHostLobbySettings(): void {
	const { lobbySettings } = voiceController.getSnapshot();
	lastSentLobbySettings = lobbySettings;
	ipcRenderer.send(IpcMessages.SEND_TO_SETTINGS, IpcSettingsMessages.NOTIFY_HOST_LOBBYSETTINGS_CHANGED, lobbySettings);
}

function sendAll(): void {
	sendGameState();
	sendHostLobbySettings();
}

function onGameStoreChanged(): void {
	if (gameStore.getSnapshot().gameState !== lastSentGameState) sendGameState();
}

function onVoiceChanged(): void {
	if (voiceController.getSnapshot().lobbySettings !== lastSentLobbySettings) sendHostLobbySettings();
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
