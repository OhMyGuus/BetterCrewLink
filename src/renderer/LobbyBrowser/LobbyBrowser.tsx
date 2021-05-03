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

const store = new Store<ISettings>();
const serverUrl = store.get('serverURL', 'https://bettercrewl.ink/');
const language = store.get('language', 'en');

const StyledTableCell = withStyles((theme) => ({
	head: {
		backgroundColor: '#1d1a23',
		color: theme.palette.common.white,
	},
	body: {
		fontSize: 14,
	},
}))(TableCell);

const StyledTableRow = withStyles((theme) => ({
	root: {
		'&:nth-of-type(odd)': {
			backgroundColor: '#25232a',
		},
		'&:nth-of-type(even)': {
			backgroundColor: '#1d1a23',
		},
	},
}))(TableRow);

interface PublicLobby {
	Id: number;
	title: string;
	host: string;
	current_players: number;
	max_players: number;
	language: string;
	mods: string;
	isPublic: boolean;
	server: string;
}

const useStyles = makeStyles({
	table: {
		minWidth: 700,
	},
	container: {
		maxHeight: '400px',
	},
});

export interface lobbyMap {
	[peer: number]: PublicLobby;
}
export default function lobbyBrowser({ t }) {
	const classes = useStyles();
	const [publiclobbies, setPublicLobbies] = useState<lobbyMap>({});
	const [socket, setSocket] = useState<SocketIOClient.Socket>();
	useEffect(() => {
		let s = io(serverUrl, {
			transports: ['websocket'],
		});
		setSocket(s);
		s.on('connect', () => {
			s.emit('lobbybrowser', true);
			
		});
		s.on('update_lobby', (lobby: PublicLobby) => {
			setPublicLobbies((old) => ({ ...old, [lobby.Id]: lobby }));
		});

		s.on('new_lobbies', (lobbies: PublicLobby[]) => {
			setPublicLobbies((old) => {
				for (let index in lobbies) {
					old[lobbies[index].Id] = lobbies[index];
				}
				return old;
			});
		});
		s.on('remove_lobby', (lobbyId: number) => {
			setPublicLobbies((old) => {
				delete old[lobbyId];
				return old;
			});
		});
		setPublicLobbies({});
		return () => {
			socket?.emit('lobbybrowser', false);
			socket?.close();
		};
	}, []);


	return (
		<div style={{ height: '100%', width: '100%', paddingTop: '15px' }}>
			<div style={{ height: '500px', padding: '20px' }}>
				<b>{t('lobbybrowser.header')}</b>

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
								{Object.values(publiclobbies).map((row) => (
									<StyledTableRow key={row.Id}>
										<StyledTableCell component="th" scope="row">
											{row.title}
										</StyledTableCell>
										<StyledTableCell align="left">{row.host}</StyledTableCell>
										<StyledTableCell align="left">
											{row.current_players}/{row.max_players}
										</StyledTableCell>
										<StyledTableCell align="left">{row.mods}</StyledTableCell>
										<StyledTableCell align="left">{row.language}</StyledTableCell>
										<StyledTableCell align="right">
											<Button
												variant="contained"
												color="secondary"
												onClick={() => {
													socket?.emit('join_lobby', row.Id, (state: number, codeOrError: string, server: string) => {
														if (state === 0) {
															ipcRenderer.send(IpcHandlerMessages.JOIN_LOBBY, codeOrError, server);
														} else {
															window.alert(`Error: ${codeOrError}`);
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
