import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import React from 'react';
import { shell, ipcRenderer } from '../lib/electron-bridge';
import Box from '@mui/material/Box';

const useStyles = () => ({
	button: {
		color: 'white',
		background: 'none',
		padding: '2px 10px',
		borderRadius: '10px',
		border: '2px solid white',
		fontSize: 19,
		outline: 'none',
		fontWeight: 500,
		fontFamily: '"Varela", sans-serif',
		marginTop: '24px',
		'&:hover': {
			borderColor: '#00ff00',
			cursor: 'pointer',
		},
	},
});
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
			<Box component="button" sx={classes.button} onClick={onRefreshClick}>
				Reload
			</Box>
		</Typography>
	);
};

export default SupportLink;
