export enum GamePlatform {
	EPIC = 'EPIC',
	STEAM = 'STEAM',
	MICROSOFT = 'MICROSOFT',
}

export enum PlatformRunType {
	URI = 'URI',
	EXE = 'EXE',
}

export interface GamePlatformMap {
	[name: string]: GamePlatformInstance;
}

export interface GamePlatformInstance {
	default: boolean;
	key: GamePlatform | string;
	launchType: PlatformRunType;
	runPath: string;
	execute: string[];
	translateKey: string;
}

export const DefaultGamePlatforms: GamePlatformMap = {
	[GamePlatform.STEAM]: {
		default: true,
		key: GamePlatform.STEAM,
		launchType: PlatformRunType.URI,
		runPath: 'steam://rungameid/945360',
		execute: [''],
		translateKey: 'platform.steam',
	},
	[GamePlatform.EPIC]: {
		default: true,
		key: GamePlatform.EPIC,
		launchType: PlatformRunType.URI,
		runPath: 'com.epicgames.launcher://apps/963137e4c29d4c79a81323b8fab03a40?action=launch&silent=true',
		execute: [''],
		translateKey: 'platform.epicgames',
	},
	[GamePlatform.MICROSOFT]: {
		default: true,
		key: GamePlatform.MICROSOFT,
		launchType: PlatformRunType.EXE,
		runPath: 'none',
		execute: ['Among Us.exe'],
		translateKey: 'platform.microsoft',
	},
};
