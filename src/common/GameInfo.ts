import { ModsType } from './Mods';

export interface GameInfo {
	appVersion: string;
	broadcastVersion: number;
	offsetsVersion: number;
	is64bit: boolean;
	platform: string;
	mod: ModsType;
	mods: string[];
}
