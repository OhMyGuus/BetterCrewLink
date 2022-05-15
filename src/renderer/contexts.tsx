import { createContext } from 'react';
import { AmongUsState } from '../common/AmongUsState';
import { ILobbySettings, ISettings } from '../common/ISettings';
import { setSetting, setLobbySetting } from './settings/SettingsStore';


// TODO: Redo this entire file
type SettingsContextValue = [
	ISettings,
	typeof setSetting,
	typeof setLobbySetting
];

type HostSettingsContextValue = [
	ILobbySettings,
	React.Dispatch<React.SetStateAction<ILobbySettings>>
];

export const PlayerColorContext = createContext<string[][]>([] as string[][]);
export const GameStateContext = createContext<AmongUsState>({} as AmongUsState);
export const HostSettingsContext = createContext<HostSettingsContextValue>((null as unknown) as HostSettingsContextValue);
export const SettingsContext = createContext<SettingsContextValue>((null as unknown) as SettingsContextValue);
// export const LobbySettingsContext = createContext<LobbySettingsContextValue>(
// 	(null as unknown) as LobbySettingsContextValue
// );
