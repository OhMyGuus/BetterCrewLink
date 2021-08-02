
export enum HKEY {
    HKEY_CLASSES_ROOT = "HKEY_CLASSES_ROOT",
    HKEY_CURRENT_CONFIG = "HKEY_CURRENT_CONFIG",
    HKEY_DYN_DATA = "HKEY_DYN_DATA",
    HKEY_CURRENT_USER_LOCAL_SETTINGS = "HKEY_CURRENT_USER_LOCAL_SETTINGS",
    HKEY_CURRENT_USER = "HKEY_CURRENT_USER",
    HKEY_LOCAL_MACHINE = "HKEY_LOCAL_MACHINE",
    HKEY_PERFORMANCE_DATA = "HKEY_PERFORMANCE_DATA",
    HKEY_PERFORMANCE_TEXT = "HKEY_PERFORMANCE_TEXT",
    HKEY_PERFORMANCE_NLSTEXT = "HKEY_PERFORMANCE_NLSTEXT",
    HKEY_USERS = "HKEY_USERS"
}

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
	launchType?: PlatformRunType;
	registryKey?: HKEY;
	registrySubKey?: string;
	registryFindKey?: string;
	registryKeyValue?: string;
	run: string;
	exeFile?: string;
	translateKey: string;
}

export const DefaultWindowsGamePlatforms: GamePlatformMap = {
	[GamePlatform.STEAM]: {
		available: false,
		key: GamePlatform.STEAM,
		launchType: PlatformRunType.URI,
		registryKey: HKEY.HKEY_CLASSES_ROOT,
		registrySubKey: 'steam',
		registryKeyValue: 'URL Protocol',
		run: 'steam://rungameid/945360',
		translateKey: 'platform.steam',
	},
	[GamePlatform.EPIC]: {
		available: false,
		key: GamePlatform.EPIC,
		launchType: PlatformRunType.URI,
		registryKey: HKEY.HKEY_CLASSES_ROOT,
		registrySubKey: 'com.epicgames.launcher',
		registryKeyValue: 'URL Protocol',
		run: 'com.epicgames.launcher://apps/963137e4c29d4c79a81323b8fab03a40?action=launch&silent=true',
		translateKey: 'platform.epicgames',
	},
	[GamePlatform.MICROSOFT]: {
		available: false,
		key: GamePlatform.MICROSOFT,
		launchType: PlatformRunType.EXE,
		registryKey: HKEY.HKEY_CURRENT_USER,
		registrySubKey:
			'SOFTWARE\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\CurrentVersion\\AppModel\\Repository\\Packages',
		registryFindKey: 'Innersloth.AmongUs',
		registryKeyValue: 'PackageRootFolder',
		run: 'none',
		exeFile: 'Among Us.exe',
		translateKey: 'platform.microsoft',
	},
}

export const DefaultLinuxGamePlatforms: GamePlatformMap = {
	[GamePlatform.STEAM]: {
		available: false,
		key: GamePlatform.STEAM,
		run: '/usr/bin/steam steam://rungameid/945360',
		translateKey: 'platform.steam',
	}
};

