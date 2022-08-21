import React, { useEffect, useMemo, useState, CSSProperties } from 'react';
import { ipcRenderer } from 'electron';
import { AmongUsState, GameState, VoiceState } from '../common/AmongUsState';
import { IpcOverlayMessages, IpcMessages } from '../common/ipc-messages';
import ReactDOM from 'react-dom';
import makeStyles from '@mui/styles/makeStyles';
import './css/overlay.css';
import Avatar from './Avatar';
import { ISettings } from '../common/ISettings';
import { DEFAULT_PLAYERCOLORS } from '../main/avatarGenerator';

interface UseStylesProps {
	height: number;
	width: number;
	oldHud: boolean;
}

export interface playerContainerCss extends CSSProperties {
	'--size': string;
}

const useStyles = makeStyles(() => ({
	meetingHud: {
		position: 'absolute',
		top: '50%',
		left: '50%',
		width: ({ width }: UseStylesProps) => width,
		height: ({ height }: UseStylesProps) => height,
		transform: 'translate(-50%, -50%)',
	},
	tabletContainer: {
		width: ({ oldHud }: UseStylesProps) => (oldHud ? '88.45%' : '100%'),
		height: '10.5%',
		left: ({ oldHud }: UseStylesProps) => (oldHud ? '4.7%' : '0.4%'),
		top: ({ oldHud }: UseStylesProps) => (oldHud ? '18.4703%' : '15%'),
		position: 'absolute',
		display: 'flex',
		flexWrap: 'wrap',
	},
	playerContainer: {
		width: ({ oldHud }: UseStylesProps) => (oldHud ? '46.41%' : '30%'),
		height: ({ oldHud }: UseStylesProps) => (oldHud ? '100%' : '109%'),
		borderRadius: ({ height }: UseStylesProps) => height / 100,
		transition: 'opacity .1s linear',
		marginBottom: ({ oldHud }: UseStylesProps) => (oldHud ? '2%' : '1.9%'),
		marginRight: ({ oldHud }: UseStylesProps) => (oldHud ? '2.34%' : '0.23%'),
		marginLeft: ({ oldHud }: UseStylesProps) => (oldHud ? '0%' : '2.4%'),
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

const iPadRatio = 854 / 579;

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
						borderColor={!player.isLocal || player.shiftedColor == -1 ? '#2ecc71' : 'gray'}
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
	const playerContainerStyle = { '--size': 7.5 * (10 / avatars.length) + 'vh' } as playerContainerCss;
	return (
		<div>
			<div className={classnames.join(' ')} style={playerContainerStyle}>
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
	const [windowWidth, windowheight] = useWindowSize();
	const [width, height] = useMemo(() => {
		if (gameState.oldMeetingHud) {
			let hudWidth = 0,
				hudHeight = 0;
			if (windowWidth / (windowheight * 0.96) > iPadRatio) {
				hudHeight = windowWidth * 0.96;
				hudWidth = hudHeight * iPadRatio;
			} else {
				hudWidth = windowWidth;
				hudHeight = windowWidth * (1 / iPadRatio);
			}
			return [hudWidth, hudWidth];
		}

		let resultW;
		const ratio_diff = Math.abs(windowWidth / windowheight - 1.7);

		if (ratio_diff < 0.25) {
			resultW = windowWidth / 1.192;
		} else if (ratio_diff < 0.5) {
			resultW = windowWidth / 1.146;
		} else {
			resultW = windowWidth / 1.591;
		}

		const resultH = resultW / 1.72;

		return [resultW, resultH];
	}, [windowWidth, windowheight, gameState.oldMeetingHud]);

	const classes = useStyles({
		width: width,
		height: height,
		oldHud: gameState.oldMeetingHud,
	});
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
					opacity: voiceState.otherTalking[player.clientId] || (player.isLocal && voiceState.localTalking) ? 1 : 0,
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
		<div className={classes.meetingHud}>
			<div className={classes.tabletContainer}>{overlays}</div>
		</div>
	);
};

ReactDOM.render(<Overlay />, document.getElementById('app'));

export default Overlay;
