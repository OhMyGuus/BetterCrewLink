import React, { Dispatch, SetStateAction, useEffect, useState, useRef } from 'react';
import Voice from './Voice';
import Menu from './Menu';
import { ipcRenderer, shell } from 'electron';
import { AmongUsState } from '../common/AmongUsState';
import Settings from './settings/Settings';
import SettingsStore, { setSetting, setLobbySetting } from './settings/SettingsStore';
import { GameStateContext, SettingsContext, PlayerColorContext, HostSettingsContext } from './contexts';
import { ThemeProvider, Theme, StyledEngineProvider } from '@mui/material/styles';
import makeStyles from '@mui/styles/makeStyles';
import {
	AutoUpdaterState,
	IpcHandlerMessages,
	IpcMessages,
	IpcRendererMessages,
	IpcSyncMessages,
} from '../common/ipc-messages';
import theme from './theme';
import SettingsIcon from '@mui/icons-material/Settings';
import RefreshSharpIcon from '@mui/icons-material/RefreshSharp';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import LinearProgress from '@mui/material/LinearProgress';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import prettyBytes from 'pretty-bytes';
import { IpcOverlayMessages } from '../common/ipc-messages';
import ReactDOM from 'react-dom';
import './css/index.css';
import 'source-code-pro/source-code-pro.css';
import 'typeface-varela/index.css';
import { DEFAULT_PLAYERCOLORS } from '../main/avatarGenerator';
import './language/i18n';
import { withNamespaces } from 'react-i18next';
import { ISettings } from '../common/ISettings';


declare module '@mui/styles/defaultTheme' {
	// eslint-disable-next-line @typescript-eslint/no-empty-interface
	interface DefaultTheme extends Theme { }
}


let appVersion = '';
if (typeof window !== 'undefined' && window.location) {
	const query = new URLSearchParams(window.location.search.substring(1));
	appVersion = ' v' + query.get('version') || '';
}

const useStyles = makeStyles(() => ({
	root: {
		position: 'absolute',
		width: '100vw',
		height: theme.spacing(3),
		backgroundColor: '#1d1a23',
		top: 0,
		WebkitAppRegion: 'drag',
		zIndex: 100,
	},
	title: {
		width: '100%',
		textAlign: 'center',
		display: 'block',
		height: theme.spacing(3),
		lineHeight: theme.spacing(3),
		color: theme.palette.primary.main,
	},
	button: {
		WebkitAppRegion: 'no-drag',
		marginLeft: 'auto',
		padding: 0,
		position: 'absolute',
		top: 0,
	},
}));

interface TitleBarProps {
	settingsOpen: boolean;
	setSettingsOpen: Dispatch<SetStateAction<boolean>>;
}

const RawTitleBar: React.FC<TitleBarProps> = function ({ settingsOpen, setSettingsOpen }: TitleBarProps) {
	const classes = useStyles();
	return (
		<div className={classes.root}>
			<span className={classes.title} style={{ marginLeft: 10 }}>
				BetterCrewLink{appVersion}
			</span>
			<IconButton
				className={classes.button}
				style={{ left: 0 }}
				size="small"
				onClick={() => setSettingsOpen(!settingsOpen)}
			>
				<SettingsIcon htmlColor="#777" />
			</IconButton>
			<IconButton
				className={classes.button}
				style={{ left: 22 }}
				size="small"
				onClick={() => ipcRenderer.send('reload')}
			>
				<RefreshSharpIcon htmlColor="#777" />
			</IconButton>
			<IconButton
				className={classes.button}
				style={{ right: 0 }}
				size="small"
				onClick={() => ipcRenderer.send(IpcMessages.QUIT_CREWLINK)}
			>
				<CloseIcon htmlColor="#777" />
			</IconButton>
		</div>
	);
};

const TitleBar = React.memo(RawTitleBar);

enum AppState {
	MENU,
	VOICE,
}
// @ts-ignore
export default function App({ t }): JSX.Element {
	const [state, setState] = useState<AppState>(AppState.MENU);
	const [gameState, setGameState] = useState<AmongUsState>({} as AmongUsState);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [diaOpen, setDiaOpen] = useState(true);
	const [error, setError] = useState('');
	const [updaterState, setUpdaterState] = useState<AutoUpdaterState>({
		state: 'unavailable',
	});
	const playerColors = useRef<string[][]>(DEFAULT_PLAYERCOLORS);
	const overlayInitCount = useRef<number>(0);

	const [settings, setSettings] = useState(SettingsStore.store);
	const [hostLobbySettings, setHostLobbySettings] = useState(settings.localLobbySettings);
	useEffect(() => {
		SettingsStore.onDidAnyChange((newValue, _) => { setSettings(newValue as ISettings) });
	}, []);

	useEffect(() => {
		ipcRenderer.send(IpcMessages.SEND_TO_OVERLAY, IpcOverlayMessages.NOTIFY_PLAYERCOLORS_CHANGED, playerColors.current);
		ipcRenderer.send(IpcMessages.SEND_TO_OVERLAY, IpcOverlayMessages.NOTIFY_SETTINGS_CHANGED, SettingsStore.store);
		ipcRenderer.send(IpcMessages.SEND_TO_OVERLAY, IpcOverlayMessages.NOTIFY_GAME_STATE_CHANGED, gameState);
	}, [overlayInitCount.current]);

	useEffect(() => {
		const onOpen = (_: Electron.IpcRendererEvent, isOpen: boolean) => {
			setState(isOpen ? AppState.VOICE : AppState.MENU);
		};
		const onState = (_: Electron.IpcRendererEvent, newState: AmongUsState) => {
			setGameState(newState);
		};

		const onError = (_: Electron.IpcRendererEvent, error: string) => {
			shouldInit = false;
			setError(error);
		};
		const onAutoUpdaterStateChange = (_: Electron.IpcRendererEvent, state: AutoUpdaterState) => {
			setUpdaterState((old) => ({ ...old, ...state }));
		};
		const onColorsChange = (_: Electron.IpcRendererEvent, colors: string[][]) => {
			console.log('RECIEVED COLORS');
			playerColors.current = colors;
			ipcRenderer.send(IpcMessages.SEND_TO_OVERLAY, IpcOverlayMessages.NOTIFY_PLAYERCOLORS_CHANGED, colors);
		};

		const onOverlayInit = () => {
			overlayInitCount.current++;
		};

		let shouldInit = true;
		ipcRenderer
			.invoke(IpcHandlerMessages.START_HOOK)
			.then(() => {
				if (shouldInit) {
					setGameState(ipcRenderer.sendSync(IpcSyncMessages.GET_INITIAL_STATE));
				}
			})
			.catch((error: Error) => {
				if (shouldInit) {
					shouldInit = false;
					setError(error.message);
				}
			});
		ipcRenderer.on(IpcRendererMessages.AUTO_UPDATER_STATE, onAutoUpdaterStateChange);
		ipcRenderer.on(IpcRendererMessages.NOTIFY_GAME_OPENED, onOpen);
		ipcRenderer.on(IpcRendererMessages.NOTIFY_GAME_STATE_CHANGED, onState);
		ipcRenderer.on(IpcRendererMessages.ERROR, onError);
		ipcRenderer.on(IpcOverlayMessages.NOTIFY_PLAYERCOLORS_CHANGED, onColorsChange);
		ipcRenderer.on(IpcOverlayMessages.REQUEST_INITVALUES, onOverlayInit);

		return () => {
			ipcRenderer.off(IpcRendererMessages.AUTO_UPDATER_STATE, onAutoUpdaterStateChange);
			ipcRenderer.off(IpcRendererMessages.NOTIFY_GAME_OPENED, onOpen);
			ipcRenderer.off(IpcRendererMessages.NOTIFY_GAME_STATE_CHANGED, onState);
			ipcRenderer.off(IpcRendererMessages.ERROR, onError);
			ipcRenderer.off(IpcOverlayMessages.NOTIFY_PLAYERCOLORS_CHANGED, onColorsChange);
			shouldInit = false;
		};
	}, []);

	useEffect(() => {
		ipcRenderer.send(IpcMessages.SEND_TO_OVERLAY, IpcOverlayMessages.NOTIFY_GAME_STATE_CHANGED, gameState);
	}, [gameState]);

	useEffect(() => {
		ipcRenderer.send(IpcMessages.SEND_TO_OVERLAY, IpcOverlayMessages.NOTIFY_PLAYERCOLORS_CHANGED, playerColors.current);
		ipcRenderer.send(IpcMessages.SEND_TO_OVERLAY, IpcOverlayMessages.NOTIFY_SETTINGS_CHANGED, SettingsStore.store);
	}, [settings]);

	let page;
	switch (state) {
		case AppState.MENU:
			page = <Menu t={t} error={error} />;
			break;
		case AppState.VOICE:
			page = <Voice t={t} error={error} />;
			break;
	}

	return (
		<PlayerColorContext.Provider value={playerColors.current}>
			<GameStateContext.Provider value={gameState}>
				<HostSettingsContext.Provider value={[hostLobbySettings, setHostLobbySettings]}>
					<SettingsContext.Provider value={[settings, setSetting, setLobbySetting]}>
						<StyledEngineProvider injectFirst>
							<ThemeProvider theme={theme}>
								<TitleBar settingsOpen={settingsOpen} setSettingsOpen={setSettingsOpen} />
								<Settings t={t} open={settingsOpen} onClose={() => setSettingsOpen(false)} />
								<Dialog fullWidth open={updaterState.state !== 'unavailable' && diaOpen}>
									{updaterState.state === 'available' && updaterState.info && (
										<DialogTitle>Update v{updaterState.info.version}</DialogTitle>
									)}
									{updaterState.state === 'error' && (
										<DialogTitle>Updater Error</DialogTitle>
									)}
									{updaterState.state === 'downloading' && <DialogTitle>Updating...</DialogTitle>}
									<DialogContent>
										{updaterState.state === 'downloading' && updaterState.progress && (
											<>
												<LinearProgress variant={'determinate'} value={updaterState.progress.percent} />
												<DialogContentText>
													{prettyBytes(updaterState.progress.transferred)} / {prettyBytes(updaterState.progress.total)}
												</DialogContentText>
											</>
										)}
										{updaterState.state === 'available' && (
											<>
												<LinearProgress variant={'indeterminate'} />
												<DialogContentText>Update now or later?</DialogContentText>
											</>
										)}
										{updaterState.state === 'error' && (
											<DialogContentText color="error">{String(updaterState.error)}</DialogContentText>
										)}
									</DialogContent>
									{updaterState.state === 'error' && (
										<DialogActions>
											<Button
												color="grey"
												onClick={() => {
													shell.openExternal("https://github.com/OhMyGuus/BetterCrewLink/releases/latest");
												}}
											>
												Download Manually
											</Button>
											<Button
												color="grey"
												onClick={() => {
													setDiaOpen(false);
												}}
											>
												Skip
											</Button>
										</DialogActions>
									)}
									{updaterState.state === 'available' && (
										<DialogActions>
											<Button
												onClick={() => {
													ipcRenderer.send('update-app');
												}}
											>
												Now
											</Button>
											<Button
												onClick={() => {
													setDiaOpen(false);
												}}
											>
												Later
											</Button>
										</DialogActions>
									)}
								</Dialog>
								{page}
							</ThemeProvider>
						</StyledEngineProvider>
					</SettingsContext.Provider>
				</HostSettingsContext.Provider>
			</GameStateContext.Provider>
		</PlayerColorContext.Provider>
	);
}
// @ts-ignore
const App2 = withNamespaces()(App);
// @ts-ignore
ReactDOM.render(<App2 />, document.getElementById('app'));
