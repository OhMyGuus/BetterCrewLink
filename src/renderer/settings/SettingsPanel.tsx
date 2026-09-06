import React, { useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { TFunction } from 'i18next';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import TuneIcon from '@mui/icons-material/Tune';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import LayersIcon from '@mui/icons-material/Layers';
import ScienceIcon from '@mui/icons-material/Science';
import VideocamIcon from '@mui/icons-material/Videocam';
import { ILobbySettings } from '../../common/ISettings';
import { GameState } from '../../common/AmongUsState';
import { IpcHandlerMessages } from '../../common/ipc-messages';
import { GameStateContext, SettingsContext } from '../state/contexts';
import { ipcRenderer } from '../lib/electron-bridge';
import SettingsStore from './SettingsStore';
import { useConfirmDialog } from './SettingsControls';
import GeneralSection from './sections/GeneralSection';
import LobbySection from './sections/LobbySection';
import PlayersSection from './sections/PlayersSection';
import AudioSection, { MediaDevice } from './sections/AudioSection';
import KeybindsSection, { ShortcutSetting } from './sections/KeybindsSection';
import OverlaySection from './sections/OverlaySection';
import AdvancedSection from './sections/AdvancedSection';
import StreamingSection from './sections/StreamingSection';

type CategoryId = 'general' | 'lobby' | 'players' | 'audio' | 'keybinds' | 'overlay' | 'advanced' | 'streaming';

const MY_LOBBY_COMMIT_DELAY = 750;

export interface SettingsPanelProps {
	t: TFunction;
	activeLobbySettings: ILobbySettings | null;
	hostId: number;
	playerColors: string[][];
}

const SettingsPanel: React.FC<SettingsPanelProps> = function ({ t, activeLobbySettings, hostId, playerColors }) {
	const [settings, setSettings] = useContext(SettingsContext);
	const gameState = useContext(GameStateContext);
	const { confirm, dialog } = useConfirmDialog(t);

	const [category, setCategory] = useState<CategoryId>('general');
	const [devices, setDevices] = useState<MediaDevice[]>([]);
	const [deviceRefreshCount, refreshDevices] = useReducer((count: number) => count + 1, 0);

	const gameInProgress = gameState?.gameState === GameState.TASKS || gameState?.gameState === GameState.DISCUSSION;
	const canEditMyLobbySettings = !(gameState?.isHost && gameInProgress);
	const canResetSettings =
		gameState?.gameState === undefined ||
		!gameState?.isHost ||
		gameState.gameState === GameState.MENU ||
		gameState.gameState === GameState.LOBBY;

	const [myLobbyDraft, setMyLobbyDraft] = useState<ILobbySettings>(settings.myLobbySettings);
	const pendingMyLobbyDraft = useRef<ILobbySettings | null>(null);

	const flushMyLobbyDraft = useCallback(() => {
		if (!pendingMyLobbyDraft.current) return;
		setSettings('myLobbySettings', pendingMyLobbyDraft.current);
		pendingMyLobbyDraft.current = null;
	}, [setSettings]);

	useEffect(() => {
		if (!pendingMyLobbyDraft.current) return;
		const timeout = setTimeout(flushMyLobbyDraft, MY_LOBBY_COMMIT_DELAY);
		return () => clearTimeout(timeout);
	}, [myLobbyDraft, flushMyLobbyDraft]);

	const updateMyLobbySettings = useCallback((partial: Partial<ILobbySettings>) => {
		setMyLobbyDraft((current) => {
			const next = { ...current, ...partial };
			pendingMyLobbyDraft.current = next;
			return next;
		});
	}, []);

	useEffect(() => {
		window.addEventListener('beforeunload', flushMyLobbyDraft);
		window.addEventListener('blur', flushMyLobbyDraft);
		return () => {
			flushMyLobbyDraft();
			window.removeEventListener('beforeunload', flushMyLobbyDraft);
			window.removeEventListener('blur', flushMyLobbyDraft);
		};
	}, [flushMyLobbyDraft]);

	useEffect(() => {
		if (category !== 'lobby') flushMyLobbyDraft();
	}, [category, flushMyLobbyDraft]);

	useEffect(() => {
		navigator.mediaDevices.enumerateDevices().then((mediaDevices) =>
			setDevices(
				mediaDevices.map((device) => {
					let label = device.label;
					if (device.deviceId === 'default') {
						label = t('buttons.default');
					} else {
						const match = /.+?\([^(]+\)/.exec(device.label);
						if (match && match[0]) label = match[0];
					}
					return { id: device.deviceId, kind: device.kind, label };
				})
			)
		);
	}, [deviceRefreshCount, t]);

	const setShortcut = useCallback(
		(shortcut: ShortcutSetting, key: string) => {
			setSettings(shortcut, key);
			ipcRenderer.send(IpcHandlerMessages.RESET_KEYHOOKS);
		},
		[setSettings]
	);

	const resetDefaults = useCallback(() => {
		pendingMyLobbyDraft.current = null;
		SettingsStore.clear();
		ipcRenderer.send(IpcHandlerMessages.RESET_KEYHOOKS);
		ipcRenderer.send('reload');
		location.reload();
	}, []);

	const categories = useMemo(
		() =>
			[
				{ id: 'general', label: t('settings.general'), icon: <TuneIcon fontSize="small" /> },
				{ id: 'lobby', label: t('settings.lobbysettings.title'), icon: <GroupsIcon fontSize="small" /> },
				{ id: 'players', label: t('settings.players.title'), icon: <PersonIcon fontSize="small" /> },
				{ id: 'audio', label: t('settings.audio.title'), icon: <VolumeUpIcon fontSize="small" /> },
				{ id: 'keybinds', label: t('settings.keyboard.title'), icon: <KeyboardIcon fontSize="small" /> },
				{ id: 'overlay', label: t('settings.overlay.title'), icon: <LayersIcon fontSize="small" /> },
				{ id: 'advanced', label: t('settings.advanced.title'), icon: <ScienceIcon fontSize="small" /> },
				{ id: 'streaming', label: t('settings.streaming.title'), icon: <VideocamIcon fontSize="small" /> },
			] as { id: CategoryId; label: string; icon: React.JSX.Element }[],
		[t]
	);

	return (
		<Box sx={{ display: 'flex', height: '100%', minHeight: 0 }}>
			<Box
				component="nav"
				sx={{
					width: 200,
					flexShrink: 0,
					borderRight: '1px solid rgba(255,255,255,0.08)',
					backgroundColor: 'rgba(0,0,0,0.2)',
					overflowY: 'auto',
				}}
			>
				<List dense disablePadding sx={{ py: 1 }}>
					{categories.map(({ id, label, icon }) => (
						<ListItemButton
							key={id}
							selected={category === id}
							onClick={() => setCategory(id)}
							sx={{
								mx: 1,
								borderRadius: 1,
								'&.Mui-selected': { backgroundColor: 'rgba(206,147,216,0.16)' },
								'&.Mui-selected:hover': { backgroundColor: 'rgba(206,147,216,0.24)' },
							}}
						>
							<ListItemIcon sx={{ minWidth: 32, color: category === id ? 'primary.main' : 'text.secondary' }}>
								{icon}
							</ListItemIcon>
							<ListItemText
								primary={label}
								slotProps={{
									primary: { variant: 'body2', sx: { fontWeight: category === id ? 700 : 400, lineHeight: 1.3 } },
								}}
							/>
						</ListItemButton>
					))}
				</List>
			</Box>

			<Box sx={{ flex: 1, minWidth: 0, overflowY: 'auto', px: 3, py: 2 }}>
				<Box sx={{ maxWidth: 720, mx: 'auto' }}>
					{category === 'general' && (
						<GeneralSection
							t={t}
							settings={settings}
							setSettings={setSettings}
							canResetSettings={canResetSettings}
							resetDefaults={resetDefaults}
							confirm={confirm}
						/>
					)}
					{category === 'lobby' && (
						<LobbySection
							t={t}
							gameState={gameState}
							activeLobbySettings={activeLobbySettings}
							hostId={hostId}
							myLobbySettings={myLobbyDraft}
							canEditMine={canEditMyLobbySettings}
							editDisabledReason={t('settings.lobbysettings.inlobbyonly')}
							update={updateMyLobbySettings}
							confirm={confirm}
						/>
					)}
					{category === 'players' && (
						<PlayersSection t={t} gameState={gameState} playerColors={playerColors} settings={settings} />
					)}
					{category === 'audio' && (
						<AudioSection
							t={t}
							settings={settings}
							setSettings={setSettings}
							devices={devices}
							refreshDevices={refreshDevices}
							confirm={confirm}
						/>
					)}
					{category === 'keybinds' && <KeybindsSection t={t} settings={settings} setShortcut={setShortcut} />}
					{category === 'overlay' && <OverlaySection t={t} settings={settings} setSettings={setSettings} />}
					{category === 'advanced' && (
						<AdvancedSection t={t} settings={settings} setSettings={setSettings} confirm={confirm} />
					)}
					{category === 'streaming' && <StreamingSection t={t} settings={settings} setSettings={setSettings} />}
				</Box>
			</Box>

			{dialog}
		</Box>
	);
};

export default SettingsPanel;
