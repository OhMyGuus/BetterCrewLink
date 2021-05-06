import React, { useEffect, useState } from 'react';
import { withStyles, makeStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import { ipcRenderer } from 'electron';
import { IpcHandlerMessages } from '../../common/ipc-messages';
import io from 'socket.io-client';
import Store from 'electron-store';
import { ISettings } from '../../common/ISettings';
import i18next from 'i18next';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@material-ui/core';
import languages from '../language/languages';
import { PublicLobbyMap, PublicLobby, modList } from '../../common/PublicLobby';

const store = new Store<ISettings>();
const serverUrl = store.get('serverURL', 'https://bettercrewl.ink/');
const language = store.get('language', 'en');
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
	'50.116.1.42': 'North America',
	'172.105.251.170': 'Europe',
	'139.162.111.196': 'Asia',
};

// @ts-ignore
export default function lobbyBrowser({ t }) {
	const classes = useStyles();
	const [publiclobbies, setPublicLobbies] = useState<PublicLobbyMap>({});
	const [socket, setSocket] = useState<SocketIOClient.Socket>();
	const [code, setCode] = React.useState('');

	useEffect(() => {
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
		return () => {
			socket?.emit('lobbybrowser', false);
			socket?.close();
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
					<DialogTitle id="alert-dialog-slide-title">{t('lobbybrowser.code')}</DialogTitle>
					<DialogContent>
						<DialogContentText id="alert-dialog-slide-description">
							{code.split('\n').map((i, key) => {
								return <p key={key}>{i}</p>;
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
									<StyledTableCell align="left"></StyledTableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{Object.values(publiclobbies).map((row: PublicLobby) => (
									<StyledTableRow key={row.id}>
										<StyledTableCell component="th" scope="row">
											{row.title}
										</StyledTableCell>
										<StyledTableCell align="left">{row.host}</StyledTableCell>
										<StyledTableCell align="left">
											{row.current_players}/{row.max_players}
										</StyledTableCell>
										<StyledTableCell align="left">{modList.find((o) => o.id === row.mods)?.label ?? 'NONE'}</StyledTableCell>
										<StyledTableCell align="left">{(languages as any)[row.language].name ?? 'English'}</StyledTableCell>
										<StyledTableCell align="right">
											<Button
												variant="contained"
												color="secondary"
												onClick={() => {
													socket?.emit('join_lobby', row.id, (state: number, codeOrError: string, server: string) => {
														if (state === 0) {
															ipcRenderer.send(IpcHandlerMessages.JOIN_LOBBY, codeOrError, server);
														} else {
															setCode(`Error: ${codeOrError}`);
														}
													});
												}}
											>
												Join
											</Button>
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
