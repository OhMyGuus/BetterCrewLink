import React, { Dispatch, SetStateAction, useEffect, useReducer, useState, useRef } from 'react';
import Voice from './Voice';
import Menu from './Menu';
import { ipcRenderer } from 'electron';
import { AmongUsState } from '../common/AmongUsState';
import Settings, { settingsReducer, lobbySettingsReducer, pushToTalkOptions } from './settings/Settings';
import { GameStateContext, SettingsContext, LobbySettingsContext } from './contexts';
import { ThemeProvider } from '@material-ui/core/styles';
import {
	AutoUpdaterState,
	IpcHandlerMessages,
	IpcMessages,
	IpcRendererMessages,
	IpcSyncMessages,
} from '../common/ipc-messages';
import theme from './theme';
import SettingsIcon from '@material-ui/icons/Settings';
import RefreshSharpIcon from '@material-ui/icons/RefreshSharp';
import CloseIcon from '@material-ui/icons/Close';
import IconButton from '@material-ui/core/IconButton';
import Dialog from '@material-ui/core/Dialog';
import makeStyles from '@material-ui/core/styles/makeStyles';
import LinearProgress from '@material-ui/core/LinearProgress';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';
import prettyBytes from 'pretty-bytes';
import { IpcOverlayMessages } from '../common/ipc-messages';
import ReactDOM from 'react-dom';
import './css/index.css';
import 'source-code-pro/source-code-pro.css';
import 'typeface-varela/index.css';
import { DEFAULT_PLAYERCOLORS } from '../main/avatarGenerator';
import './language/i18n';
import { withNamespaces } from 'react-i18next';
import { GamePlatform } from '../common/GamePlatform';
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
	},
	title: {
		width: '100%',
		textAlign: 'center',
		display: 'block',
		height: theme.spacing(3),
		lineHeight: `${theme.spacing(3)}px`,
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

const TitleBar: React.FC<TitleBarProps> = function ({ settingsOpen, setSettingsOpen }: TitleBarProps) {
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

	const settings = useReducer(settingsReducer, {
		language: 'default',
		alwaysOnTop: true,
		microphone: 'Default',
		speaker: 'Default',
		pushToTalkMode: pushToTalkOptions.VOICE,
		serverURL: 'https://bettercrewl.ink/',
		pushToTalkShortcut: 'V',
		deafenShortcut: 'RControl',
		muteShortcut: 'RAlt',
		impostorRadioShortcut: 'F',
		hideCode: false,
		natFix: false,
		mobileHost: true,
		overlayPosition: 'right',
		compactOverlay: false,
		enableOverlay: false,
		meetingOverlay: false,
		ghostVolume: 100,
		masterVolume: 100,
		microphoneGain: 100,
		micSensitivity: 0.15,
		microphoneGainEnabled: false,
		micSensitivityEnabled: false,
		vadEnabled: true,
		hardware_acceleration: true,
		echoCancellation: true,
		enableSpatialAudio: true,
		obsSecret: undefined,
		obsOverlay: false,
		noiseSuppression: true,
		playerConfigMap: {},
		localLobbySettings: {
			maxDistance: 5.32,
			haunting: false,
			hearImpostorsInVents: false,
			impostersHearImpostersInvent: false,
			impostorRadioEnabled: false,
			commsSabotage: false,
			deadOnly: false,
			meetingGhostOnly: false,
			hearThroughCameras: false,
			wallsBlockAudio: false,
			visionHearing: false,
			publicLobby_on: false,
			publicLobby_title: '',
			publicLobby_language: 'en',
			publicLobby_mods: 'NONE',
		},
		launchPlatform: GamePlatform.STEAM,
	});
	const lobbySettings = useReducer(lobbySettingsReducer, settings[0].localLobbySettings);

	useEffect(() => {
		ipcRenderer.send(IpcMessages.SEND_TO_OVERLAY, IpcOverlayMessages.NOTIFY_PLAYERCOLORS_CHANGED, playerColors.current);
		ipcRenderer.send(IpcMessages.SEND_TO_OVERLAY, IpcOverlayMessages.NOTIFY_SETTINGS_CHANGED, settings[0]);
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
		console.log(playerColors.current);
		ipcRenderer.send(IpcMessages.SEND_TO_OVERLAY, IpcOverlayMessages.NOTIFY_PLAYERCOLORS_CHANGED, playerColors.current);
		ipcRenderer.send(IpcMessages.SEND_TO_OVERLAY, IpcOverlayMessages.NOTIFY_SETTINGS_CHANGED, settings[0]);
	}, [settings[0]]);

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
		<GameStateContext.Provider value={gameState}>
			<LobbySettingsContext.Provider value={lobbySettings}>
				<SettingsContext.Provider value={settings}>
					<ThemeProvider theme={theme}>
						<TitleBar settingsOpen={settingsOpen} setSettingsOpen={setSettingsOpen} />
						<Settings t={t} open={settingsOpen} onClose={() => setSettingsOpen(false)} />
						<Dialog fullWidth open={updaterState.state !== 'unavailable' && diaOpen}>
							{updaterState.state === 'downloaded' && updaterState.info && (
								<DialogTitle>Update v{updaterState.info.version}</DialogTitle>
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
								{updaterState.state === 'downloaded' && (
									<>
										<LinearProgress variant={'indeterminate'} />
										<DialogContentText>Restart now or later?</DialogContentText>
									</>
								)}
								{updaterState.state === 'error' && (
									<DialogContentText color="error">{updaterState.error}</DialogContentText>
								)}
							</DialogContent>
							{updaterState.state === 'error' && (
								<DialogActions>
									<Button href="https://github.com/OhMyGuus/BetterCrewLink/releases/latest">Download Manually</Button>
								</DialogActions>
							)}
							{updaterState.state === 'downloaded' && (
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
				</SettingsContext.Provider>
			</LobbySettingsContext.Provider>
		</GameStateContext.Provider>
	);
}
// @ts-ignore
const App2 = withNamespaces()(App);
// @ts-ignore
ReactDOM.render(<App2 />, document.getElementById('app'));
