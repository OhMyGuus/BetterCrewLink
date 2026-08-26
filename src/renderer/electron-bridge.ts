interface IpcRendererBridge {
	send(channel: string, ...args: any[]): void;
	invoke(channel: string, ...args: any[]): Promise<any>;
	sendSync(channel: string, ...args: any[]): any;
	on(channel: string, listener: (...args: any[]) => void): void;
	off(channel: string, listener?: (...args: any[]) => void): void;
}

interface ElectronBridge {
	ipcRenderer: IpcRendererBridge;
	shell: {
		openExternal(url: string): Promise<void>;
	};
	getPathForFile(file: File): string;
	platform: string;
}

declare global {
	interface Window {
		electron: ElectronBridge;
	}
}

export const ipcRenderer: IpcRendererBridge = window.electron.ipcRenderer;
export const shell = window.electron.shell;
export const getPathForFile = (file: File): string => window.electron.getPathForFile(file);
export const platform: string = window.electron.platform;
