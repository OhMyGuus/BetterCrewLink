import React, { useEffect, useMemo } from 'react';
import { withStyles, makeStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';

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

function createData(
	joinId: number,
	title: string,
	host: string,
	current_players: number,
	max_players: number,
	language: string,
	mods: string
) {
	return { joinId, title, host, current_players, max_players, language, mods };
}

const useStyles = makeStyles({
	table: {
		minWidth: 700,
	},
	container: {
		maxHeight: '400px',
	},
});

export default function lobbyBrowser() {
	const classes = useStyles();

	useEffect(() => {
		window.resizeTo(900, 500);
		return () => {
			window.resizeTo(250, 350);
		};
	}, []);

	const rows = useMemo(() => {
		const rows = [createData(0, 'FUN 18+', 'player2', 1, 10, 'EN', 'NONE')];
		for (let i = 0; i < 5; i++) rows.push(createData(1 + i, 'FUN 18+', `player${i}`, 1, 10, 'EN', 'NONE'));
		return rows;
	}, []);

	return (
		<div style={{ height: '100%', width: '100%', paddingTop: '15px' }}>
			<div style={{ height: '500px', padding: '20px' }}>
				<b>Public lobbies</b>

				<Paper>
					<TableContainer component={Paper} className={classes.container}>
						<Table className={classes.table} aria-label="customized table" stickyHeader>
							<TableHead>
								<TableRow>
									<StyledTableCell>Title</StyledTableCell>
									<StyledTableCell align="left">Host</StyledTableCell>
									<StyledTableCell align="left">Players</StyledTableCell>
									<StyledTableCell align="left">Mods</StyledTableCell>
									<StyledTableCell align="left">Language</StyledTableCell>
									<StyledTableCell align="left"></StyledTableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{rows.map((row) => (
									<StyledTableRow key={row.joinId}>
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
											<Button variant="contained" color="secondary">
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
