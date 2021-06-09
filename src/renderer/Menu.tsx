import React, { useEffect } from 'react';
import { ipcRenderer } from 'electron';
import Footer from './Footer';
import { IpcMessages } from '../common/ipc-messages';
import makeStyles from '@material-ui/core/styles/makeStyles';
import CircularProgress from '@material-ui/core/CircularProgress';
import Typography from '@material-ui/core/Typography';
import SupportLink from './SupportLink';
import { useContext } from 'react';
import { TextField } from '@material-ui/core';
import { SettingsContext } from './contexts';
import { GamePlatformMap } from '../common/ISettings';

const useStyles = makeStyles((theme) => ({
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
		marginTop: 12,
		marginBottom: 12,
	},
	button: {
		color: 'white',
		background: 'none',
		padding: '2px 10px',
		borderRadius: 10,
		border: '4px solid white',
		fontSize: 24,
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

export interface MenuProps {
	t: (key: string) => string;
	error: string;
}

const Menu: React.FC<MenuProps> = function ({ t, error }: MenuProps) {
	const classes = useStyles();

	const [settings, setSettings] = useContext(SettingsContext);

	useEffect(() => {
		ipcRenderer.invoke(IpcMessages.REQUEST_PLATFORMS_AVAILABLE, settings.launchPlatformSettings).then((result: GamePlatformMap) => {
			setSettings({
				type: 'setOne',
				action: ['launchPlatformSettings', result]
			});
		});
	}, [])

	useEffect(() => {
		if (!settings.launchPlatformSettings[settings.launchPlatform].available) {
			for (const key in settings.launchPlatformSettings) {
				const platform = settings.launchPlatformSettings[key];
				if (platform.available) {
					setSettings({
						type: 'setOne',
						action: ['launchPlatform', key]
					})
					break;
				}
			}
		}
	}, [settings.launchPlatformSettings])

	return (
		<div className={classes.root}>
			<div className={classes.menu}>
				{error ? (
					<div className={classes.error}>
						<Typography align="center" variant="h6" color="error">
							{t('game.error')}
						</Typography>
						<Typography align="center" style={{ whiteSpace: 'pre-wrap' }}>
							{error}
						</Typography>
						<SupportLink />
					</div>
				) : (
					<>
						<span className={classes.waiting}>{t('game.waiting')}</span>
						<CircularProgress color="primary" size={40} />
						<button
							className={classes.button}
							onClick={() => {
								ipcRenderer.send(IpcMessages.OPEN_AMONG_US_GAME, settings.launchPlatformSettings[settings.launchPlatform]);
							}}
						>
							{t('game.open')}
						</button>
						<TextField
							select
							label="Platform"
							variant="outlined"
							color="secondary"
							value={settings.launchPlatform}
							SelectProps={{ native: true }}
							InputLabelProps={{ shrink: true }}
							onChange={(ev) => {
								setSettings({
									type: 'setOne',
									action: ['launchPlatform', ev.target.value],
								});
							}}
						>
							{Array.from(Object.keys(settings.launchPlatformSettings)).reduce((filtered: any[], key) => {
								console.log("Platforms: ", settings.launchPlatformSettings);
								const value = settings.launchPlatformSettings[key];
								if (value.available) {
									filtered.push(
										<option key={value.name} value={key}>
											{value.name}
										</option>
									);
								}
								return filtered;
							}, [])}
						</TextField>
					</>
				)}
				<Footer />
			</div>
		</div>
	);
};

export default Menu;
