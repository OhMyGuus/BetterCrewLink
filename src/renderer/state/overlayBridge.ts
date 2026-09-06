import { AmongUsState } from '../../common/AmongUsState';
import { IpcMessages, IpcOverlayMessages } from '../../common/ipc-messages';
import { ipcRenderer } from '../lib/electron-bridge';
import SettingsStore from '../settings/SettingsStore';
import { gameStore } from './gameStore';

let started = false;
let unsubscribeGameStore: (() => void) | undefined;
let lastSentSignature: string | undefined;
let lastSentPlayerColors: unknown;

/**
 * Covers exactly the fields the overlay renders. Player positions deliberately excluded:
 * they change every tick and the overlay never reads them.
 */
function overlaySignature(state: AmongUsState | undefined): string {
	if (!state) return '';
	const players = (state.players ?? [])
		.map((player) =>
			[
				player.id,
				player.clientId,
				player.name,
				player.colorId,
				player.hatId,
				player.skinId,
				player.visorId,
				player.shiftedColor,
				player.inVent ? 1 : 0,
				player.isDead ? 1 : 0,
				player.isLocal ? 1 : 0,
				player.disconnected ? 1 : 0,
				player.bugged ? 1 : 0,
			].join(',')
		)
		.join(';');
	return `${state.gameState}|${state.oldMeetingHud ? 1 : 0}|${state.mod}|${players}`;
}

function sendGameState(): void {
	const { gameState } = gameStore.getSnapshot();
	lastSentSignature = overlaySignature(gameState);
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
	if (!SettingsStore.store.enableOverlay) return;
	const { gameState, playerColors } = gameStore.getSnapshot();
	if (overlaySignature(gameState) !== lastSentSignature) sendGameState();
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
