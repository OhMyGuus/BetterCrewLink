import { AmongUsState } from '../../common/AmongUsState';
import {
	IpcHandlerMessages,
	IpcOverlayMessages,
	IpcRendererMessages,
	IpcSyncMessages,
} from '../../common/ipc-messages';
import { DEFAULT_PLAYERCOLORS } from '../../common/playerColors';
import { ipcRenderer } from '../lib/electron-bridge';

export interface GameStoreSnapshot {
	gameState: AmongUsState;
	gameOpen: boolean;
	playerColors: string[][];
	error: string;
}

const listeners = new Set<() => void>();

let snapshot: GameStoreSnapshot = {
	gameState: {} as AmongUsState,
	gameOpen: false,
	playerColors: DEFAULT_PLAYERCOLORS,
	error: '',
};

let started = false;
let hookFailed = false;

function update(partial: Partial<GameStoreSnapshot>): void {
	let changed = false;
	for (const key of Object.keys(partial) as (keyof GameStoreSnapshot)[]) {
		if (snapshot[key] !== partial[key]) {
			changed = true;
			break;
		}
	}
	if (!changed) return;
	snapshot = { ...snapshot, ...partial };
	for (const listener of Array.from(listeners)) listener();
}

function onGameOpened(_: unknown, isOpen: boolean): void {
	update({ gameOpen: isOpen });
}

function onGameStateChanged(_: unknown, newState: AmongUsState): void {
	update({ gameState: newState });
}

function onError(_: unknown, error: string): void {
	hookFailed = true;
	update({ error });
}

function onPlayerColorsChanged(_: unknown, colors: string[][]): void {
	update({ playerColors: colors });
}

export function startGameStore(): void {
	if (started) return;
	started = true;

	ipcRenderer.on(IpcRendererMessages.NOTIFY_GAME_OPENED, onGameOpened);
	ipcRenderer.on(IpcRendererMessages.NOTIFY_GAME_STATE_CHANGED, onGameStateChanged);
	ipcRenderer.on(IpcRendererMessages.ERROR, onError);
	ipcRenderer.on(IpcOverlayMessages.NOTIFY_PLAYERCOLORS_CHANGED, onPlayerColorsChanged);

	ipcRenderer
		.invoke(IpcHandlerMessages.START_HOOK)
		.then(() => {
			if (hookFailed) return;
			update({ gameState: ipcRenderer.sendSync(IpcSyncMessages.GET_INITIAL_STATE) as AmongUsState });
		})
		.catch((error: Error) => {
			if (hookFailed) return;
			hookFailed = true;
			update({ error: error.message });
		});
}

export function stopGameStore(): void {
	if (!started) return;
	started = false;
	ipcRenderer.off(IpcRendererMessages.NOTIFY_GAME_OPENED, onGameOpened);
	ipcRenderer.off(IpcRendererMessages.NOTIFY_GAME_STATE_CHANGED, onGameStateChanged);
	ipcRenderer.off(IpcRendererMessages.ERROR, onError);
	ipcRenderer.off(IpcOverlayMessages.NOTIFY_PLAYERCOLORS_CHANGED, onPlayerColorsChanged);
}

export const gameStore = {
	subscribe(listener: () => void): () => void {
		listeners.add(listener);
		return () => listeners.delete(listener);
	},
	getSnapshot(): GameStoreSnapshot {
		return snapshot;
	},
};
