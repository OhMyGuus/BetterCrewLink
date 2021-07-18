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
	available: boolean;
	key: GamePlatform;
	launchType: PlatformRunType;
	run: string;
	exeFile?: string;
	translateKey: string;
}

export const DefaultGamePlatforms: GamePlatformMap = {
	[GamePlatform.STEAM]: {
		available: false,
		key: GamePlatform.STEAM,
		launchType: PlatformRunType.URI,
		run: 'steam://rungameid/945360',
		translateKey: 'platform.steam',
	},
	[GamePlatform.EPIC]: {
		available: false,
		key: GamePlatform.EPIC,
		launchType: PlatformRunType.URI,
		run: 'com.epicgames.launcher://apps/963137e4c29d4c79a81323b8fab03a40?action=launch&silent=true',
		translateKey: 'platform.epicgames',
	},
	[GamePlatform.MICROSOFT]: {
		available: false,
		key: GamePlatform.MICROSOFT,
		launchType: PlatformRunType.EXE,
		run: 'none',
		exeFile: 'Among Us.exe',
		translateKey: 'platform.microsoft',
	},
};