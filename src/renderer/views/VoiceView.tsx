import React, { useContext, useMemo } from 'react';
import Typography from '@mui/material/Typography';
import { styled, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import VolumeOff from '@mui/icons-material/VolumeOff';
import VolumeUp from '@mui/icons-material/VolumeUp';
import Mic from '@mui/icons-material/Mic';
import MicOff from '@mui/icons-material/MicOff';

import Avatar from '../components/Avatar';
import Footer from '../components/Footer';
import SupportLink from '../components/SupportLink';
import { GameStateContext, SettingsContext } from '../state/contexts';
import { GameState } from '../../common/AmongUsState';
import { IpcHandlerMessages } from '../../common/ipc-messages';
import { ipcRenderer } from '../lib/electron-bridge';
import { useVoiceEngine } from '../voice/useVoiceController';

export interface VoiceProps {
	t: (key: string) => string;
	error: string;
}

const useStyles = () => {
	const theme = useTheme();
	return {
		error: {
			position: 'absolute',
			top: '50%',
			transform: 'translateY(-50%)',
		},
		root: {
			paddingTop: theme.spacing(3),
		},
		top: {
			display: 'flex',
			justifyContent: 'center',
			alignItems: 'center',
		},
		right: {
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'center',
			justifyContent: 'center',
		},
		username: {
			display: 'block',
			textAlign: 'center',
			fontSize: 20,
			whiteSpace: 'nowrap',
			maxWidth: '115px',
		},
		code: {
			fontFamily: "'Source Code Pro', monospace",
			display: 'block',
			width: 'fit-content',
			margin: '5px auto',
			padding: '5px',
			borderRadius: '5px',
			fontSize: 28,
		},
		avatarWrapper: {
			width: 80,
			padding: theme.spacing(1),
		},
		muteButtons: {
			paddingLeft: '5px',
			paddingTop: '26px',
			float: 'right',
			display: 'grid',
		},
		left: { float: 'left' },
	};
};

const otherPlayersGridWidth = 225;
const otherPlayersGridGap = 8;

const OtherPlayersGrid = styled(Box)({
	display: 'grid',
	gap: otherPlayersGridGap,
	width: 'fit-content',
	margin: '4px auto',
});

function getPlayersPerRow(playerCount: number): number {
	if (playerCount <= 9) return 3;
	return Math.min(12, Math.ceil(Math.sqrt(playerCount)));
}

function getOtherPlayerAvatarSize(playersPerRow: number): number {
	return otherPlayersGridWidth / playersPerRow - otherPlayersGridGap;
}

const VoiceView: React.FC<VoiceProps> = function ({ t, error: initialError }: VoiceProps) {
	const classes = useStyles();
	const gameState = useContext(GameStateContext);
	const [settings, setSetting] = useContext(SettingsContext);
	const { voice, controller } = useVoiceEngine();

	const myPlayer = useMemo(() => gameState?.players?.find((player) => player.isLocal), [gameState?.players]);
	const vadHidden = (myPlayer?.shiftedColor ?? -1) !== -1 && gameState?.gameState !== GameState.DISCUSSION;

	const otherPlayers = useMemo(() => {
		if (!gameState?.players || !myPlayer) return [];
		return gameState.players.filter((player) => !player.isLocal);
	}, [gameState?.players, myPlayer]);

	const playerConfigs = settings.playerConfigMap;

	let displayedLobbyCode = gameState.lobbyCode;
	if (displayedLobbyCode !== 'MENU' && settings.hideCode) displayedLobbyCode = 'LOBBY';

	const otherPlayersPerRow = getPlayersPerRow(otherPlayers.length);
	const otherPlayerAvatarSize = getOtherPlayerAvatarSize(otherPlayersPerRow);
	const error = voice.error || initialError;

	return (
		<Box sx={classes.root}>
			{error && (
				<Box sx={classes.error}>
					<Typography align="center" variant="h6" color="error">
						ERROR
					</Typography>
					<Typography align="center" style={{ whiteSpace: 'pre-wrap' }}>
						{error}
					</Typography>
					<SupportLink />
				</Box>
			)}
			{!error && (
				<>
					<Box sx={classes.top}>
						{myPlayer && gameState.lobbyCode !== 'MENU' && (
							<Box sx={classes.avatarWrapper}>
								<Avatar
									deafened={voice.deafened}
									muted={voice.muted}
									player={myPlayer}
									borderColor={vadHidden ? 'gray' : '#2ecc71'}
									connectionState={voice.connected ? 'connected' : 'disconnected'}
									isUsingRadio={myPlayer.isImpostor && voice.impostorRadioClientId === myPlayer.clientId}
									talking={voice.talking}
									isAlive={!myPlayer.isDead}
									size={100}
									mod={gameState.mod}
								/>
							</Box>
						)}
						<Box sx={classes.right}>
							<div>
								<Box sx={classes.left}>
									{myPlayer && gameState?.gameState !== GameState.MENU && (
										<Box component="span" sx={classes.username}>
											{myPlayer.name}
										</Box>
									)}
									<Box
										component="span"
										sx={classes.code}
										style={{
											background: gameState.lobbyCode === 'MENU' ? 'transparent' : '#3e4346',
										}}
									>
										{displayedLobbyCode === 'MENU' ? t('game.menu') : displayedLobbyCode}
									</Box>
								</Box>
								{gameState.lobbyCode !== 'MENU' && (
									<Box sx={classes.muteButtons}>
										<IconButton onClick={controller.toggleMute} size="small">
											{voice.muted || voice.deafened ? <MicOff /> : <Mic />}
										</IconButton>
										<IconButton onClick={controller.toggleDeafen} size="small">
											{voice.deafened ? <VolumeOff /> : <VolumeUp />}
										</IconButton>
									</Box>
								)}
							</div>
						</Box>
					</Box>
					{voice.activeLobbySettings?.deadOnly && (
						<Box sx={classes.top}>
							<small style={{ padding: 0 }}>{t('settings.lobbysettings.ghost_only_warning2')}</small>
						</Box>
					)}
					{voice.activeLobbySettings?.meetingGhostOnly && (
						<Box sx={classes.top}>
							<small style={{ padding: 0 }}>{t('settings.lobbysettings.meetings_only_warning2')}</small>
						</Box>
					)}
					{gameState.lobbyCode && <Divider />}
					{displayedLobbyCode === 'MENU' && (
						<Box sx={classes.top}>
							<Button
								style={{ margin: '10px' }}
								onClick={() => ipcRenderer.send(IpcHandlerMessages.OPEN_LOBBYBROWSER)}
								color="primary"
								variant="outlined"
							>
								{t('buttons.public_lobby')}
							</Button>
						</Box>
					)}
					{myPlayer && gameState.lobbyCode !== 'MENU' && (
						<OtherPlayersGrid sx={{ gridTemplateColumns: `repeat(${otherPlayersPerRow}, ${otherPlayerAvatarSize}px)` }}>
							{otherPlayers.map((player) => {
								const peer = voice.playerSocketIds[player.clientId];
								const connected = voice.socketClients[peer]?.clientId === player.clientId || false;

								if (!playerConfigs[player.nameHash]) {
									playerConfigs[player.nameHash] = { volume: 1, isMuted: false };
								}

								const theirVadHidden = player.shiftedColor !== -1 && gameState?.gameState !== GameState.DISCUSSION;

								return (
									<Box key={player.id} sx={{ width: otherPlayerAvatarSize }}>
										<Avatar
											connectionState={
												!connected ? 'disconnected' : voice.audioConnected[peer] ? 'connected' : 'novoice'
											}
											player={player}
											talking={!player.inVent && !theirVadHidden && voice.otherTalking[player.clientId]}
											borderColor="#2ecc71"
											isAlive={!voice.otherDead[player.clientId]}
											isUsingRadio={
												myPlayer.isImpostor &&
												!(player.disconnected || player.bugged) &&
												voice.impostorRadioClientId === player.clientId
											}
											size={otherPlayerAvatarSize}
											socketConfig={playerConfigs[player.nameHash]}
											onConfigChange={() =>
												setSetting(`playerConfigMap.${player.nameHash}`, playerConfigs[player.nameHash])
											}
											mod={gameState.mod}
										/>
									</Box>
								);
							})}
						</OtherPlayersGrid>
					)}
				</>
			)}
			{otherPlayers.length <= 6 && <Footer />}
		</Box>
	);
};

export default VoiceView;
