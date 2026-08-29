import { AmongUsState } from '../../common/AmongUsState';
import { ILobbySettings } from '../../common/ISettings';
import { IpcMessages, IpcSettingsMessages } from '../../common/ipc-messages';
import { ipcRenderer } from '../lib/electron-bridge';

export interface RemoteGameSnapshot {
	gameState: AmongUsState;
	hostLobbySettings: ILobbySettings | null;
}

const listeners = new Set<() => void>();

let snapshot: RemoteGameSnapshot = {
	gameState: {} as AmongUsState,
	hostLobbySettings: null,
};

let started = false;

function update(partial: Partial<RemoteGameSnapshot>): void {
	snapshot = { ...snapshot, ...partial };
	for (const listener of Array.from(listeners)) listener();
}

function onGameStateChanged(_: unknown, gameState: AmongUsState): void {
	update({ gameState: gameState ?? ({} as AmongUsState) });
}

function onHostLobbySettingsChanged(_: unknown, hostLobbySettings: ILobbySettings | null): void {
	update({ hostLobbySettings: hostLobbySettings ?? null });
}

export function startRemoteGameStore(): void {
	if (started) return;
	started = true;

	ipcRenderer.on(IpcSettingsMessages.NOTIFY_GAME_STATE_CHANGED, onGameStateChanged);
	ipcRenderer.on(IpcSettingsMessages.NOTIFY_HOST_LOBBYSETTINGS_CHANGED, onHostLobbySettingsChanged);
	ipcRenderer.send(IpcMessages.SEND_TO_MAINWINDOW, IpcSettingsMessages.REQUEST_INITVALUES);
}

export function stopRemoteGameStore(): void {
	if (!started) return;
	started = false;
	ipcRenderer.off(IpcSettingsMessages.NOTIFY_GAME_STATE_CHANGED, onGameStateChanged);
	ipcRenderer.off(IpcSettingsMessages.NOTIFY_HOST_LOBBYSETTINGS_CHANGED, onHostLobbySettingsChanged);
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
