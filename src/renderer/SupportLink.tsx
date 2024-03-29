import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import React from 'react';
import { shell, ipcRenderer } from 'electron';
import makeStyles from '@mui/styles/makeStyles';

const useStyles = makeStyles(() => ({
	button: {
		color: 'white',
		background: 'none',
		padding: '2px 10px',
		borderRadius: 10,
		border: '2px solid white',
		fontSize: 19,
		outline: 'none',
		fontWeight: 500,
		fontFamily: '"Varela", sans-serif',
		marginTop: 24,
		'&:hover': {
			borderColor: '#00ff00',
			cursor: 'pointer',
		},
	},
}));
const onRefreshClick = () => {
	ipcRenderer.send('reload');
};

const SupportLink: React.FC = function () {
	const classes = useStyles();

	return (
		<Typography align="center">
			Need help?&nbsp;
			<Link href="#" color="secondary" onClick={() => shell.openExternal('https://discord.gg/4cpvp3KyhF')}>
				Get support
			</Link>
			<button className={classes.button} onClick={onRefreshClick}>
				Reload
			</button>
		</Typography>
	);
};

export default SupportLink;
