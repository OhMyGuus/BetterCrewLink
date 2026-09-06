import { contextBridge, ipcRenderer, shell, webUtils } from 'electron';

type Listener = (...args: unknown[]) => void;

const listenerWrappers = new Map<string, Map<Listener, Listener>>();

const bridge = {
	ipcRenderer: {
		send(channel: string, ...args: unknown[]): void {
			ipcRenderer.send(channel, ...args);
		},
		invoke(channel: string, ...args: unknown[]): Promise<unknown> {
			return ipcRenderer.invoke(channel, ...args);
		},
		sendSync(channel: string, ...args: unknown[]): unknown {
			return ipcRenderer.sendSync(channel, ...args);
		},
		on(channel: string, listener: Listener): void {
			let wrappers = listenerWrappers.get(channel);
			if (!wrappers) {
				wrappers = new Map<Listener, Listener>();
				listenerWrappers.set(channel, wrappers);
			}
			if (wrappers.has(listener)) return;

			const wrapped = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => listener(undefined, ...args);
			wrappers.set(listener, wrapped);
			ipcRenderer.on(channel, wrapped);
		},
		off(channel: string, listener?: Listener): void {
			if (!listener) {
				listenerWrappers.delete(channel);
				ipcRenderer.removeAllListeners(channel);
				return;
			}

			const wrappers = listenerWrappers.get(channel);
			const wrapped = wrappers?.get(listener);
			if (!wrappers || !wrapped) return;

			wrappers.delete(listener);
			if (wrappers.size === 0) listenerWrappers.delete(channel);
			ipcRenderer.removeListener(channel, wrapped);
		},
	},
	shell: {
		openExternal(url: string): Promise<void> {
			return shell.openExternal(url);
		},
	},
	getPathForFile(file: File): string {
		return webUtils.getPathForFile(file);
	},
	platform: process.platform,
};

contextBridge.exposeInMainWorld('electron', bridge);
