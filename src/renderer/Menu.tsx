import React, { useEffect, useRef, useState, useContext } from 'react';
import { ipcRenderer } from 'electron';
import Footer from './Footer';
import { IpcMessages } from '../common/ipc-messages';
import makeStyles from '@material-ui/core/styles/makeStyles';
import CircularProgress from '@material-ui/core/CircularProgress';
import Typography from '@material-ui/core/Typography';
import SupportLink from './SupportLink';
import { Button, ButtonGroup, ClickAwayListener, MenuItem, MenuList, Paper, Popper } from '@material-ui/core';
import { SettingsContext } from './contexts';
import { GamePlatformMap } from '../common/ISettings';
import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';

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
		textTransform: 'none',
	},
}));

export interface MenuProps {
	t: (key: string) => string;
	error: string;
}

const Menu: React.FC<MenuProps> = function ({ t, error }: MenuProps) {
	const classes = useStyles();

	const [settings, setSettings] = useContext(SettingsContext);

	const [launchItemList, setLaunchItemList] = useState([] as any[]);
	const [openMessage, setOpenMessage] = useState(<>{t('game.error_platform')}</>);
	const [dropdownOpen, setDropdownOpen] = useState(false);

	const anchorRef = useRef(null);

	const toggleDropdownOpen = () => { setDropdownOpen((status) => !status); };

	// Grab available platforms from main thread
	useEffect(() => {
		ipcRenderer.invoke(IpcMessages.REQUEST_PLATFORMS_AVAILABLE, settings.launchPlatformSettings).then((result: GamePlatformMap) => {
			setSettings({
				type: 'setOne',
				action: ['launchPlatformSettings', result]
			});
		});
	}, []);

	// If launchPlatformSettings changes: select the first available platform and re-compute list of platforms
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

		// Generate an array of <MenuItem>'s from available platforms for dropdown
		setLaunchItemList(Array.from(Object.keys(settings.launchPlatformSettings)).reduce((filtered: any[], key) => {
			const platform = settings.launchPlatformSettings[key];
			if (platform.available) {
				filtered.push(
					<MenuItem key={t(platform.translateKey)}
					onClick={(_) => {
						setSettings({
							type: 'setOne',
							action: ['launchPlatform', platform.key],
						});
						toggleDropdownOpen();
					}}>
						{t(platform.translateKey)}
					</MenuItem>
				);
			}
			return filtered;
		}, []));
	}, [settings.launchPlatformSettings]);

	// Update button message when platform changes or no platforms are available (list empty)
	useEffect(() => {
		if (launchItemList.length != 0) {
			setOpenMessage(<>{t('game.open')}<br/>{t(settings.launchPlatformSettings[settings.launchPlatform].translateKey)}</>)
		} else {
			setOpenMessage(<>{t('game.error_platform')}</>);
		}
	}, [launchItemList, settings.launchPlatform]);

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
						<ButtonGroup variant="contained" ref={anchorRef}>
							<Button
								className={classes.button}
								disabled={launchItemList.length === 0}
								onClick={() => {
									ipcRenderer.send(IpcMessages.OPEN_AMONG_US_GAME, settings.launchPlatformSettings[settings.launchPlatform]);
								}}
							>
								{openMessage}
							</Button>
							<Button
								className={classes.button}
								disabled={launchItemList.length === 0}
								onClick={toggleDropdownOpen}
							>
								<ArrowDropDownIcon />
							</Button>
						</ButtonGroup>
						<Popper 
							open={dropdownOpen}
							anchorEl={anchorRef.current}
							placement="bottom-end"
							disablePortal={false}
							modifiers={{
								flip: {
								  enabled: false,
								},
								preventOverflow: {
								  enabled: true,
								  boundariesElement: 'viewport',
								},
							  }}
						>
							<Paper>
								<ClickAwayListener onClickAway={toggleDropdownOpen}>
									<MenuList>
										{launchItemList}
									</MenuList>
								</ClickAwayListener>
							</Paper>
						</Popper>
					</>
				)}
				<Footer />
			</div>
		</div>
	);
};

export default Menu;
