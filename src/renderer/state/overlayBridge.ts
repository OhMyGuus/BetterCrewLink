import { IpcMessages, IpcOverlayMessages } from '../../common/ipc-messages';
import { ipcRenderer } from '../lib/electron-bridge';
import SettingsStore from '../settings/SettingsStore';
import { gameStore } from './gameStore';

let started = false;
let unsubscribeGameStore: (() => void) | undefined;
let lastSentGameState: unknown;
let lastSentPlayerColors: unknown;

function sendGameState(): void {
	const { gameState } = gameStore.getSnapshot();
	lastSentGameState = gameState;
	ipcRenderer.send(IpcMessages.SEND_TO_OVERLAY, IpcOverlayMessages.NOTIFY_GAME_STATE_CHANGED, gameState);
}

function sendPlayerColors(): void {
	const { playerColors } = gameStore.getSnapshot();
	lastSentPlayerColors = playerColors;
	ipcRenderer.send(IpcMessages.SEND_TO_OVERLAY, IpcOverlayMessages.NOTIFY_PLAYERCOLORS_CHANGED, playerColors);
}

function sendSettings(): void {
	ipcRenderer.send(IpcMessages.SEND_TO_OVERLAY, IpcOverlayMessages.NOTIFY_SETTINGS_CHANGED, SettingsStore.store);
}

function sendAll(): void {
	sendPlayerColors();
	sendSettings();
	sendGameState();
}

function onGameStoreChanged(): void {
	const { gameState, playerColors } = gameStore.getSnapshot();
	if (gameState !== lastSentGameState) sendGameState();
	if (playerColors !== lastSentPlayerColors) sendPlayerColors();
}

export function startOverlayBridge(): void {
	if (started) return;
	started = true;

	unsubscribeGameStore = gameStore.subscribe(onGameStoreChanged);
	SettingsStore.onDidAnyChange(sendSettings);
	ipcRenderer.on(IpcOverlayMessages.REQUEST_INITVALUES, sendAll);
	sendAll();
}

export function stopOverlayBridge(): void {
	if (!started) return;
	started = false;
	unsubscribeGameStore?.();
	unsubscribeGameStore = undefined;
	SettingsStore.offDidAnyChange(sendSettings);
	ipcRenderer.off(IpcOverlayMessages.REQUEST_INITVALUES, sendAll);
}
