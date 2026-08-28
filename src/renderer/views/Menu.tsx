import React from 'react';
import Footer from '../components/Footer';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import SupportLink from '../components/SupportLink';
import LaunchButton from '../components/LaunchButton';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

const useStyles = () => {
	const theme = useTheme();
	return {
		root: {
			width: '100vw',
			height: '100vh',
			paddingTop: theme.spacing(3),
		},
		error: {
			paddingTop: theme.spacing(4),
		},
		menu: {
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'center',
			justifyContent: 'start',
		},
		waiting: {
			fontSize: 20,
			marginTop: '12px',
			marginBottom: '12px',
		},
		open_message: {
			fontSize: 24,
			marginTop: '15px',
			marginBottom: '5px',
		},
	};
};

export interface MenuProps {
	t: (key: string) => string;
	error: string;
}

const Menu: React.FC<MenuProps> = function ({ t, error }: MenuProps) {
	const classes = useStyles();

	return (
		<Box sx={classes.root}>
			<Box sx={classes.menu}>
				{error ? (
					<Box sx={classes.error}>
						<Typography align="center" variant="h6" color="error">
							{t('game.error')}
						</Typography>
						<Typography align="center" style={{ whiteSpace: 'pre-wrap' }}>
							{error}
						</Typography>
						<SupportLink />
					</Box>
				) : (
					<>
						<Box component="span" sx={classes.waiting}>
							{t('game.waiting')}
						</Box>
						<CircularProgress color="primary" size={40} />
						<Box component="span" sx={classes.open_message}>
							{t('game.open')}
						</Box>
						<LaunchButton t={t} />
					</>
				)}
				<Footer />
			</Box>
		</Box>
	);
};

export default Menu;
