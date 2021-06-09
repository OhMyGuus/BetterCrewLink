export enum GamePlatform {
    EPIC = 'EPIC',
    STEAM = 'STEAM',
}

export interface GamePlatformInstance {
    available: boolean,
    name: string,
    registryKey: string,
    shellPath: string
}

export const GamePlatforms = new Map<GamePlatform, GamePlatformInstance>([
        [GamePlatform.EPIC, {
            available: false,
            name: 'Epic Games',
            registryKey: 'com.epicgames.launcher',
            shellPath: 'com.epicgames.launcher://apps/963137e4c29d4c79a81323b8fab03a40?action=launch&silent=true',
        }],
        [GamePlatform.STEAM, {
            available: false,
            name: 'Steam',
            registryKey: 'steam',
            shellPath: 'steam://rungameid/945360',
        }]
]);