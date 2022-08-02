import React, { useEffect, useState } from 'react';
import withStyles from '@mui/styles/withStyles';
import makeStyles from '@mui/styles/makeStyles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import { ipcRenderer } from 'electron';
import { IpcHandlerMessages, IpcMessages } from '../../common/ipc-messages';
import io from 'socket.io-client';
import i18next from 'i18next';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Tooltip } from '@mui/material';
import languages from '../language/languages';
import { PublicLobbyMap, PublicLobby } from '../../common/PublicLobby';
import { modList, ModsType } from '../../common/Mods';
import { GameState } from '../../common/AmongUsState';
import SettingsStore from '../settings/SettingsStore';

const serverUrl = SettingsStore.get('serverURL', 'https://bettercrewl.ink/');
const language = SettingsStore.get('language', 'en');
i18next.changeLanguage(language);

const StyledTableCell = withStyles((theme) => ({
	head: {
		backgroundColor: '#1d1a23',
		color: theme.palette.common.white,
	},
	body: {
		fontSize: 14,
	},
}))(TableCell);

const StyledTableRow = withStyles(() => ({
	root: {
		'&:nth-of-type(odd)': {
			backgroundColor: '#25232a',
		},
		'&:nth-of-type(even)': {
			backgroundColor: '#1d1a23',
		},
	},
}))(TableRow);

const useStyles = makeStyles({
	table: {
		minWidth: 700,
	},
	container: {
		maxHeight: '400px',
	},
});

const servers: {
	[server: string]: string;
} = {
	// '50.116.1.42': 'North America',
	// '172.105.251.170': 'Europe',
	// '139.162.111.196': 'Asia',
	'192.241.154.115': 'skeld.net',
	'154.16.67.100': 'Modded (North America)',
	'78.47.142.18': 'Modded (Europe)',
};

function sortLobbies(a: PublicLobby, b: PublicLobby) {
	if (a.gameState === GameState.LOBBY && b.gameState !== GameState.LOBBY) {
		return -1;
	} else if (b.gameState === GameState.LOBBY && a.gameState !== GameState.LOBBY) {
		return 1;
	} else {
		if (b.current_players === b.max_players && a.current_players !== a.max_players) {
			return -1;
		}
		if (a.current_players < b.current_players) {
			return 1;
		} else if (a.current_players > b.current_players) {
			return -1;
		}
		return 0;
	}
}

function getModName(mod: string): string {
	return modList.find((o) => o.id === mod)?.label || (mod ?? 'None')
}

// @ts-ignore
export default function lobbyBrowser({ t }) {
	const classes = useStyles();
	const [publiclobbies, setPublicLobbies] = useState<PublicLobbyMap>({});
	const [socket, setSocket] = useState<SocketIOClient.Socket>();
	const [code, setCode] = React.useState('');
	const [, forceRender] = useState({});

	const [mod, setMod] = useState<ModsType>('NONE');
	
	useEffect(() => {
		ipcRenderer.invoke(IpcMessages.REQUEST_MOD).then((mod: ModsType) => setMod(mod));

		const s = io(serverUrl, {
			transports: ['websocket'],
		});
		setSocket(s);

		s.on('update_lobby', (lobby: PublicLobby) => {
			setPublicLobbies((old) => ({ ...old, [lobby.id]: lobby }));
		});

		s.on('new_lobbies', (lobbies: PublicLobby[]) => {
			setPublicLobbies((old) => {
				const lobbyMap: PublicLobbyMap = { ...old };
				for (const index in lobbies) {
					lobbyMap[lobbies[index].id] = lobbies[index];
				}
				return lobbyMap;
			});
		});
		s.on('remove_lobby', (lobbyId: number) => {
			setPublicLobbies((old) => {
				delete old[lobbyId];
				return { ...old };
			});
		});
		s.on('connect', () => {
			s.emit('lobbybrowser', true);
		});

		ipcRenderer.on(IpcHandlerMessages.JOIN_LOBBY_ERROR, (event, code, server) => {
			console.log('ERROR: ', code);
			setCode(`${code}  ${servers[server] ? `on region ${servers[server]}` : `\n Custom Server: ${server}`}`);
		});
		const secondPassed = setInterval(() => {
			forceRender({});
		}, 1000);
		return () => {
			socket?.emit('lobbybrowser', false);
			socket?.close();
			clearInterval(secondPassed);
		};
	}, []);

	return (
		<div style={{ height: '100%', width: '100%', paddingTop: '15px' }}>
			<div style={{ height: '500px', padding: '20px' }}>
				<b>{t('lobbybrowser.header')}</b>
				<Dialog
					open={code !== ''}
					// TransitionComponent={Transition}
					keepMounted
					aria-labelledby="alert-dialog-slide-title"
					aria-describedby="alert-dialog-slide-description"
				>
					<DialogTitle id="alert-dialog-slide-title">Lobby information</DialogTitle>
					<DialogContent>
						<DialogContentText id="alert-dialog-slide-description">
							{code.split('\n').map((i, key) => {
								return <div key={key}>{i}</div>;
							})}
						</DialogContentText>
					</DialogContent>
					<DialogActions>
						<Button onClick={() => setCode('')} color="primary">
							{t('buttons.close')}
						</Button>
					</DialogActions>
				</Dialog>
				<Paper>
					<TableContainer component={Paper} className={classes.container}>
						<Table className={classes.table} aria-label="customized table" stickyHeader>
							<TableHead>
								<TableRow>
									<StyledTableCell>{t('lobbybrowser.list.title')}</StyledTableCell>
									<StyledTableCell align="left">{t('lobbybrowser.list.host')}</StyledTableCell>
									<StyledTableCell align="left">{t('lobbybrowser.list.players')}</StyledTableCell>
									<StyledTableCell align="left">{t('lobbybrowser.list.mods')}</StyledTableCell>
									<StyledTableCell align="left">{t('lobbybrowser.list.language')}</StyledTableCell>
									<StyledTableCell align="left">Status</StyledTableCell>
									{/* {t('lobbybrowser.list.staut')} */}
									<StyledTableCell align="left"></StyledTableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{Object.values(publiclobbies)
									.sort(sortLobbies)
									.map((row: PublicLobby) => (
										<StyledTableRow key={row.id}>
											<StyledTableCell component="th" scope="row">
												{row.title}
											</StyledTableCell>
											<StyledTableCell align="left">{row.host}</StyledTableCell>
											<StyledTableCell align="left">
												{row.current_players}/{row.max_players}
											</StyledTableCell>
											<StyledTableCell align="left">
												{getModName(row.mods)}
											</StyledTableCell>
											<StyledTableCell align="left">
												{(languages as any)[row.language]?.name ?? 'English'}
											</StyledTableCell>
											<StyledTableCell align="left">
												{row.gameState === GameState.LOBBY ? 'Lobby' : 'In game'}{' '}
												{row.stateTime && new Date(Date.now() - row.stateTime).toISOString().substr(14, 5)}
											</StyledTableCell>
											<StyledTableCell align="right">
												<Tooltip
													title={
														row.gameState !== GameState.LOBBY ? t('lobbybrowser.code_tooltips.in_progress') :
														row.max_players === row.current_players ? t('lobbybrowser.code_tooltips.full_lobby') :
														row.mods != mod ? `${t('lobbybrowser.code_tooltips.incompatible')} '${getModName(mod)}' ${t('lobbybrowser.code_tooltips.and')} '${getModName(row.mods)}'` : ""
													}
												>
													<span>
														<Button
															disabled={
																row.gameState !== GameState.LOBBY ||
																row.max_players === row.current_players ||
																row.mods != mod
															}
															variant="contained"
															color="secondary"
															onClick={() => {
																socket?.emit(
																	'join_lobby',
																	row.id,
																	(state: number, codeOrError: string, server: string, publicLobby: PublicLobby) => {
																		if (state === 0) {
																			setCode(`${t('lobbybrowser.code')}: ${codeOrError} \n Region: ${server}`);
																			// ipcRenderer.send(IpcHandlerMessages.JOIN_LOBBY, codeOrError, server);
																		} else {
																			setCode(`Error: ${codeOrError}`);
																		}
																	}
																);
															}}
														>
															Show code
														</Button>
													</span>
												</Tooltip>
												{/* <Button variant="contained" color="secondary" style={{ marginLeft: '5px' }}>
												report
											</Button> */}
											</StyledTableCell>
										</StyledTableRow>
									))}
							</TableBody>
						</Table>
					</TableContainer>
				</Paper>
			</div>
		</div>
	);
}
