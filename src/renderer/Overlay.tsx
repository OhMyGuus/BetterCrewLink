import React, { useEffect, useMemo, useState } from 'react';
import { ipcRenderer } from 'electron';
import { AmongUsState, GameState, VoiceState } from '../common/AmongUsState';
import { IpcOverlayMessages, IpcMessages } from '../common/ipc-messages';
import ReactDOM from 'react-dom';
import makeStyles from '@material-ui/core/styles/makeStyles';
import './css/overlay.css';
import Avatar from './Avatar';
import { ISettings } from '../common/ISettings';
import { DEFAULT_PLAYERCOLORS } from '../main/avatarGenerator';

interface UseStylesProps {
	height: number;
	width: number;
	oldHud: boolean;
}

const useStyles = makeStyles(() => ({
	meetingHud: {
		position: 'absolute',
		top: '50%',
		left: '50%',
		transform: 'translate(-50%, -50%)',
	},
	tabletContainer: {
		width:  ({ oldHud }: UseStylesProps) => oldHud? '88.45%' : '100%',
		height: '10.5%',
		left: ({ oldHud }: UseStylesProps) => oldHud? '4.7%' : '0.4%',
		top: ({ oldHud }: UseStylesProps) => oldHud? '18.4703%' : '15%',
		position: 'absolute',
		display: 'flex',
		flexWrap: 'wrap',
	},
	playerContainer: {
		width: ({ oldHud }: UseStylesProps) => oldHud? '46.41%' : '30%',
		height: ({ oldHud }: UseStylesProps) => oldHud? '100%' : '109%',  
		borderRadius: ({ height }: UseStylesProps) => height / 100,
		transition: 'opacity .1s linear',
		marginBottom: ({ oldHud }: UseStylesProps) => oldHud? '2%' : '1.9%',
		marginRight: ({ oldHud }: UseStylesProps) => oldHud?  '2.34%' : '0.23%',
		marginLeft: ({ oldHud }: UseStylesProps) => oldHud?  '0%' : '2.4%',
		boxSizing: 'border-box',
	},
}));

function useWindowSize() {
	const [windowSize, setWindowSize] = useState<[number, number]>([0, 0]);

	useEffect(() => {
		const onResize = () => {
			setWindowSize([window.innerWidth, window.innerHeight]);
		};
		window.addEventListener('resize', onResize);
		onResize();

		return () => window.removeEventListener('resize', onResize);
	}, []);
	return windowSize;
}

// const iPadRatio = 854 / 579;

const Overlay: React.FC = function () {
	const [gameState, setGameState] = useState<AmongUsState>((undefined as unknown) as AmongUsState);
	const [voiceState, setVoiceState] = useState<VoiceState>((undefined as unknown) as VoiceState);
	const [settings, setSettings] = useState<ISettings>((undefined as unknown) as ISettings);
	const [playerColors, setColors] = useState<string[][]>(DEFAULT_PLAYERCOLORS);
	useEffect(() => {
		const onState = (_: Electron.IpcRendererEvent, newState: AmongUsState) => {
			setGameState(newState);
		};
		const onVoiceState = (_: Electron.IpcRendererEvent, newState: VoiceState) => {
			setVoiceState(newState);
		};
		const onSettings = (_: Electron.IpcRendererEvent, newState: ISettings) => {
			console.log('Recieved settings..');

			setSettings(newState);
		};
		const onColorChange = (_: Electron.IpcRendererEvent, colors: string[][]) => {
			console.log('Recieved colors..');
			setColors(colors);
			console.log('new colors: ', playerColors);
		};
		ipcRenderer.on(IpcOverlayMessages.NOTIFY_GAME_STATE_CHANGED, onState);
		ipcRenderer.on(IpcOverlayMessages.NOTIFY_VOICE_STATE_CHANGED, onVoiceState);
		ipcRenderer.on(IpcOverlayMessages.NOTIFY_SETTINGS_CHANGED, onSettings);
		ipcRenderer.on(IpcOverlayMessages.NOTIFY_PLAYERCOLORS_CHANGED, onColorChange);
		ipcRenderer.send(IpcMessages.SEND_TO_MAINWINDOW, IpcOverlayMessages.REQUEST_INITVALUES);
		console.log('REQUEST_INITVALUES');
		return () => {
			ipcRenderer.off(IpcOverlayMessages.NOTIFY_GAME_STATE_CHANGED, onState);
			ipcRenderer.off(IpcOverlayMessages.NOTIFY_VOICE_STATE_CHANGED, onVoiceState);
			ipcRenderer.off(IpcOverlayMessages.NOTIFY_SETTINGS_CHANGED, onSettings);
			ipcRenderer.on(IpcOverlayMessages.NOTIFY_PLAYERCOLORS_CHANGED, onColorChange);
		};
	}, []);

	if (!settings || !voiceState || !gameState || !settings.enableOverlay || gameState.gameState == GameState.MENU)
		return null;
	return (
		<>
			{settings.meetingOverlay && gameState.gameState === GameState.DISCUSSION && (
				<MeetingHud gameState={gameState} voiceState={voiceState} playerColors={playerColors} />
			)}
			{settings.overlayPosition !== 'hidden' && (
				<AvatarOverlay
					voiceState={voiceState}
					gameState={gameState}
					position={settings.overlayPosition}
					compactOverlay={settings.compactOverlay}
				/>
			)}
		</>
	);
};

interface AvatarOverlayProps {
	voiceState: VoiceState;
	gameState: AmongUsState;
	position: ISettings['overlayPosition'];
	compactOverlay: boolean;
}

const AvatarOverlay: React.FC<AvatarOverlayProps> = ({
	voiceState,
	gameState,
	position,
	compactOverlay,
}: AvatarOverlayProps) => {
	if (!gameState.players) return null;

	const positionParse = position.replace('1', '');

	const avatars: JSX.Element[] = [];
	const isOnSide = positionParse == 'right' || positionParse == 'left';
	const showName = isOnSide && (!compactOverlay || position === 'right1' || position === 'left1');
	const classnames: string[] = ['overlay-wrapper'];
	if (gameState.gameState == GameState.UNKNOWN || gameState.gameState == GameState.MENU) {
		classnames.push('gamestate_menu');
	} else {
		classnames.push('gamestate_game');
		classnames.push('overlay_postion_' + positionParse);
		if (compactOverlay || position === 'right1' || position === 'left1') {
			classnames.push('compactoverlay');
		}
		if (position === 'left1' || position === 'right1') {
			classnames.push('overlay_postion_' + position);
		}
	}

	const players = useMemo(() => {
		if (!gameState.players) return null;
		const playerss = gameState.players
			.filter((o) => !voiceState.localIsAlive || !(voiceState.otherDead[o.clientId] && !o.isLocal))
			.slice()
			.sort((a, b) => {
				if (
					(a.disconnected || voiceState.otherDead[a.clientId]) &&
					(b.disconnected || voiceState.otherDead[b.clientId])
				) {
					return a.id - b.id;
				} else if (a.disconnected || voiceState.otherDead[a.clientId]) {
					return 1000;
				} else if (b.disconnected || voiceState.otherDead[b.clientId]) {
					return -1000;
				}
				return a.id - b.id;
			});

		return playerss;
	}, [gameState.players]);

	// const myPLayer = useMemo(() => {
	// 	if (!gameState.players) return null;
	// 	return gameState.players.find(o => o.isLocal && (!o.disconnected || !o.bugged))
	// }, [gameState.players]);

	players?.forEach((player) => {
		if (!voiceState.otherTalking[player.clientId] && !(player.isLocal && voiceState.localTalking) && compactOverlay) {
			return;
		}
		const peer = voiceState.playerSocketIds[player.clientId];
		const connected = voiceState.socketClients[peer]?.clientId === player.clientId;
		if (!connected && !player.isLocal) {
			return;
		}
		const talking =
			!player.inVent && (voiceState.otherTalking[player.clientId] || (player.isLocal && voiceState.localTalking));
		// const audio = voiceState.audioConnected[peer];
		avatars.push(
			<div key={player.id} className="player_wrapper">
				<div>
					<Avatar
						key={player.id}
						// connectionState={!connected ? 'disconnected' : audio ? 'connected' : 'novoice'}
						player={player}
						showborder={isOnSide && !compactOverlay}
						muted={voiceState.muted && player.isLocal}
						deafened={voiceState.deafened && player.isLocal}
						connectionState={'connected'}
						talking={talking}
						borderColor="#2ecc71"
						isUsingRadio={voiceState.impostorRadioClientId == player.clientId}
						isAlive={!voiceState.otherDead[player.clientId] || (player.isLocal && !player.isDead)}
						size={100}
						lookLeft={!(positionParse === 'left' || positionParse === 'bottom_left')}
						overflow={isOnSide && !showName}
						showHat={true}
						mod={voiceState.mod}
					/>
				</div>
				{showName && (
					<span
						className="playername"
						style={{
							opacity: (position === 'right1' || position === 'left1') && !talking ? 0 : 1,
						}}
					>
						<small>{player.name}</small>
					</span>
				)}
			</div>
		);
	});
	if (avatars.length === 0) return null;
	return (
		<div>
			<div className={classnames.join(' ')}>
				<div className="otherplayers">
					<div className="players_container playerContainerBack">{avatars}</div>
				</div>
			</div>
			{/* {(voiceState.muted || voiceState.deafened) && (
				<div className="volumeicons">{voiceState.deafened ? <VolumeOff /> : <MicOff />}</div>
			)} */}
		</div>
	);
};

interface MeetingHudProps {
	gameState: AmongUsState;
	voiceState: VoiceState;
	playerColors: string[][];
}

const MeetingHud: React.FC<MeetingHudProps> = ({ voiceState, gameState, playerColors }: MeetingHudProps) => {
	let [width, height] = useWindowSize();

	// let hudWidth = 0,
	// 	hudHeight = 0;
	// 	console.log('Calculation ipadwith/height: ', width, height, (width / (height * 0.96)), iPadRatio )
	// if (width / (height * 0.96) > iPadRatio) {
	// 	hudHeight = height * 0.96;
	// 	hudWidth = hudHeight * iPadRatio;
	// 	console.log("Hudheight1 ", hudHeight, hudWidth)
	// } else {
	// 	hudWidth = width;
	// 	hudHeight = width * (1 / iPadRatio);
	// 	console.log("Hudheight2 ", hudHeight, hudWidth)
	// }

	function arrayEquals(arr1: number[], arr2: number[]) {
		for (let i = 0; i < arr1.length; i++) {
			if (arr1[i] != arr2[i]) {
				return false;
			}
		}
		return true;
	}

	width = gameState.oldMeetingHud ? width : [[1176, 664], [1280, 720], [1360, 768], [1366, 768], [1600,900], [1920, 1080]].find(e => arrayEquals(e, [width, height])) ? width / 1.192 : width / 1.146;
	height = gameState.oldMeetingHud ? height : width / 1.72;
	
	const classes = useStyles({ width, height, oldHud : gameState.oldMeetingHud});
	const players = useMemo(() => {
		if (!gameState.players) return null;
		return gameState.players.slice().sort((a, b) => {
			if ((a.disconnected || a.isDead) && (b.disconnected || b.isDead)) {
				return a.id - b.id;
			} else if (a.disconnected || a.isDead) {
				return 1000;
			} else if (b.disconnected || b.isDead) {
				return -1000;
			}
			return a.id - b.id;
		});
	}, [gameState.gameState]);
	if (!players || gameState.gameState !== GameState.DISCUSSION) return null;

	const overlays = players.map((player) => {
		const color = playerColors[player.colorId] ? playerColors[player.colorId][0] : '#C51111';

		return (
			<div
				key={player.id}
				className={classes.playerContainer}
				style={{
					opacity: 1, //voiceState.otherTalking[player.clientId] || (player.isLocal && voiceState.localTalking) ? 1 : 0,
					border: 'solid',
					borderWidth: '2px',
					borderColor: '#00000037',
					 boxShadow: `0 0 ${height / 100}px ${height / 100}px ${color}`,
					transition: 'opacity 400ms',
				}}
			/>
		);
	});

	return (
		<div className={classes.meetingHud} style={{ width: width, height: height }}>
			<div className={classes.tabletContainer}>{overlays}</div>
		</div>
	);
};

ReactDOM.render(<Overlay />, document.getElementById('app'));

export default Overlay;
