import { GamePlatformMap } from "./ISettings";

export enum GamePlatform {
    EPIC = 'EPIC',
    STEAM = 'STEAM',
}

export const DefaultGamePlatforms: GamePlatformMap = {
	[GamePlatform.STEAM]: {
		available: false,
		key: GamePlatform.STEAM,
        name: 'Steam',
		registryKey: 'steam',
		shellPath: 'steam://rungameid/945360',
	},
	[GamePlatform.EPIC]: {
		available: false,
        key: GamePlatform.EPIC,
		name: 'Epic Games',
		registryKey: 'com.epicgames.launcher',
		shellPath: 'com.epicgames.launcher://apps/963137e4c29d4c79a81323b8fab03a40?action=launch&silent=true',
	}
}