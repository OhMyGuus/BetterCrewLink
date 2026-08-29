import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles';
import { withTranslation, WithTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import MinimizeIcon from '@mui/icons-material/Minimize';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import theme from '../lib/theme';
import { ipcRenderer } from '../lib/electron-bridge';
import { ISettings } from '../../common/ISettings';
import { GameStateContext, SettingsContext } from '../state/contexts';
import { remoteGameStore, startRemoteGameStore } from '../state/remoteGameStore';
import SettingsStore, { initSettings, setSetting } from '../settings/SettingsStore';
import SettingsPanel from '../settings/SettingsPanel';
import { useLanguage } from '../language/useLanguage';
import '../css/index.css';
import 'source-code-pro/source-code-pro.css';
import 'typeface-varela/index.css';
import '../language/i18n';

const titleBarStyles = {
	root: {
		display: 'flex',
		alignItems: 'center',
		height: theme.spacing(3),
		flexShrink: 0,
		backgroundColor: '#1d1a23',
		WebkitAppRegion: 'drag',
	},
	title: {
		flex: 1,
		display: 'flex',
		alignItems: 'center',
		gap: 0.75,
		pl: 1.25,
		color: theme.palette.primary.main,
		fontSize: 13,
	},
	button: {
		WebkitAppRegion: 'no-drag',
		padding: 0,
		borderRadius: 0,
		width: 34,
		height: '100%',
	},
};

const TitleBar: React.FC<{ title: string }> = function ({ title }) {
	return (
		<Box sx={titleBarStyles.root}>
			<Box sx={titleBarStyles.title}>
				<SettingsIcon sx={{ fontSize: 14 }} />
				{title}
			</Box>
			<IconButton sx={titleBarStyles.button} size="small" onClick={() => ipcRenderer.send('minimize', 'settings')}>
				<MinimizeIcon htmlColor="#777" sx={{ fontSize: 16, mb: '-6px' }} />
			</IconButton>
			<IconButton sx={titleBarStyles.button} size="small" onClick={() => window.close()}>
				<CloseIcon htmlColor="#777" sx={{ fontSize: 16 }} />
			</IconButton>
		</Box>
	);
};

function SettingsWindow({ t }: WithTranslation): React.JSX.Element | null {
	const [settings, setSettings] = useState<ISettings>({} as ISettings);
	const [settingsLoaded, setSettingsLoaded] = useState(false);
	const { gameState, activeLobbySettings, hostId, playerColors } = useSyncExternalStore(
		remoteGameStore.subscribe,
		remoteGameStore.getSnapshot
	);

	useEffect(() => {
		const onSettingsChanged = (newValue: ISettings) => setSettings(newValue);
		SettingsStore.onDidAnyChange(onSettingsChanged);
		initSettings()
			.then((loaded) => {
				setSettings(loaded);
				setSettingsLoaded(true);
			})
			.catch(() => setSettingsLoaded(true));
		startRemoteGameStore();
		return () => SettingsStore.offDidAnyChange(onSettingsChanged);
	}, []);

	useLanguage(settings.language);

	if (!settingsLoaded) return null;

	return (
		<GameStateContext.Provider value={gameState}>
			<SettingsContext.Provider value={[settings, setSetting]}>
				<StyledEngineProvider injectFirst>
					<ThemeProvider theme={theme}>
						<Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
							<TitleBar title={t('settings.title')} />
							<SettingsPanel
								t={t}
								activeLobbySettings={activeLobbySettings}
								hostId={hostId}
								playerColors={playerColors}
							/>
						</Box>
					</ThemeProvider>
				</StyledEngineProvider>
			</SettingsContext.Provider>
		</GameStateContext.Provider>
	);
}

const TranslatedSettingsWindow = withTranslation()(SettingsWindow);
createRoot(document.getElementById('app')!).render(<TranslatedSettingsWindow />);
