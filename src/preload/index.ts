import { contextBridge, ipcRenderer, shell, webUtils } from 'electron';

const listenerWrappers = new Map<(...args: unknown[]) => void, (...args: unknown[]) => void>();

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
		on(channel: string, listener: (...args: unknown[]) => void): void {
			const wrapped = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => listener(undefined, ...args);
			listenerWrappers.set(listener, wrapped);
			ipcRenderer.on(channel, wrapped);
		},
		off(channel: string, listener?: (...args: unknown[]) => void): void {
			if (listener) {
				const wrapped = listenerWrappers.get(listener);
				if (wrapped) {
					listenerWrappers.delete(listener);
					ipcRenderer.removeListener(channel, wrapped);
					return;
				}
			}
			ipcRenderer.removeAllListeners(channel);
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
