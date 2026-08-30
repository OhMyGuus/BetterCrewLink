import { ipcRenderer } from '../lib/electron-bridge';
import { ISettings, SocketConfig } from '../../common/ISettings';
import { pushToTalkOptions } from '../../common/pushToTalkOptions';

export { pushToTalkOptions };

let currentSettings: ISettings = {} as ISettings;
const changeListeners = new Set<(settings: ISettings) => void>();

export const SettingsStore = {
	get store(): ISettings {
		return currentSettings;
	},
	get(key: string, defaultValue?: unknown): unknown {
		const value = (currentSettings as unknown as Record<string, unknown>)[key];
		return value === undefined ? defaultValue : value;
	},
	set(key: string, value: unknown): void {
		ipcRenderer.send('settings:set', key, value);
	},
	clear(): void {
		ipcRenderer.send('settings:clear');
	},
	onDidAnyChange(callback: (settings: ISettings) => void): void {
		changeListeners.add(callback);
	},
	offDidAnyChange(callback: (settings: ISettings) => void): void {
		changeListeners.delete(callback);
	},
};

let initialized = false;
function onSettingsChanged(_event: unknown, settings: ISettings) {
	currentSettings = settings;
	changeListeners.forEach((cb) => cb(settings));
}

export async function initSettings(): Promise<ISettings> {
	currentSettings = (await ipcRenderer.invoke('settings:get')) as ISettings;
	if (!initialized) {
		initialized = true;
		ipcRenderer.on('settings:changed', onSettingsChanged);
	}
	return currentSettings;
}

type ISettingOrSocketConfig<K extends keyof ISettings | `playerConfigMap.${number}`> = K extends keyof ISettings
	? ISettings[K]
	: SocketConfig;

export const setSetting = <K extends keyof ISettings | `playerConfigMap.${number}`>(
	setting: K,
	value: ISettingOrSocketConfig<K>
): void => {
	SettingsStore.set(setting as string, value);
};

export default SettingsStore;
