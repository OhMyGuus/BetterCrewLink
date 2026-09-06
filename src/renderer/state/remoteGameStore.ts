import { AmongUsState } from '../../common/AmongUsState';
import { ILobbySettings } from '../../common/ISettings';
import { IpcMessages, IpcSettingsMessages } from '../../common/ipc-messages';
import { DEFAULT_PLAYERCOLORS } from '../../common/playerColors';
import { ipcRenderer } from '../lib/electron-bridge';

export interface RemoteGameSnapshot {
	gameState: AmongUsState;
	playerColors: string[][];
	activeLobbySettings: ILobbySettings | null;
	hostId: number;
}

const listeners = new Set<() => void>();

let snapshot: RemoteGameSnapshot = {
	gameState: {} as AmongUsState,
	playerColors: DEFAULT_PLAYERCOLORS,
	activeLobbySettings: null,
	hostId: 0,
};

let started = false;

function update(partial: Partial<RemoteGameSnapshot>): void {
	snapshot = { ...snapshot, ...partial };
	for (const listener of Array.from(listeners)) listener();
}

function onGameStateChanged(_: unknown, gameState: AmongUsState): void {
	update({ gameState: gameState ?? ({} as AmongUsState) });
}

function onActiveLobbySettingsChanged(_: unknown, activeLobbySettings: ILobbySettings | null): void {
	update({ activeLobbySettings: activeLobbySettings ?? null });
}

function onPlayerColorsChanged(_: unknown, playerColors: string[][]): void {
	update({ playerColors: playerColors?.length ? playerColors : DEFAULT_PLAYERCOLORS });
}

function onHostIdChanged(_: unknown, hostId: number): void {
	update({ hostId: hostId ?? 0 });
}

export function startRemoteGameStore(): void {
	if (started) return;
	started = true;

	ipcRenderer.on(IpcSettingsMessages.NOTIFY_GAME_STATE_CHANGED, onGameStateChanged);
	ipcRenderer.on(IpcSettingsMessages.NOTIFY_ACTIVE_LOBBY_SETTINGS_CHANGED, onActiveLobbySettingsChanged);
	ipcRenderer.on(IpcSettingsMessages.NOTIFY_HOST_ID_CHANGED, onHostIdChanged);
	ipcRenderer.on(IpcSettingsMessages.NOTIFY_PLAYER_COLORS_CHANGED, onPlayerColorsChanged);
	ipcRenderer.send(IpcMessages.SEND_TO_MAINWINDOW, IpcSettingsMessages.REQUEST_INITVALUES);
}

export function stopRemoteGameStore(): void {
	if (!started) return;
	started = false;
	ipcRenderer.off(IpcSettingsMessages.NOTIFY_GAME_STATE_CHANGED, onGameStateChanged);
	ipcRenderer.off(IpcSettingsMessages.NOTIFY_ACTIVE_LOBBY_SETTINGS_CHANGED, onActiveLobbySettingsChanged);
	ipcRenderer.off(IpcSettingsMessages.NOTIFY_HOST_ID_CHANGED, onHostIdChanged);
	ipcRenderer.off(IpcSettingsMessages.NOTIFY_PLAYER_COLORS_CHANGED, onPlayerColorsChanged);
}

export const remoteGameStore = {
	subscribe(listener: () => void): () => void {
		listeners.add(listener);
		return () => listeners.delete(listener);
	},
	getSnapshot(): RemoteGameSnapshot {
		return snapshot;
	},
};
