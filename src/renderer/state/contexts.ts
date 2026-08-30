import { createContext } from 'react';
import { AmongUsState } from '../../common/AmongUsState';
import { ISettings } from '../../common/ISettings';
import { setSetting } from '../settings/SettingsStore';

type SettingsContextValue = [ISettings, typeof setSetting];

export const PlayerColorContext = createContext<string[][]>([] as string[][]);
export const GameStateContext = createContext<AmongUsState>({} as AmongUsState);
export const SettingsContext = createContext<SettingsContextValue>(null as unknown as SettingsContextValue);
