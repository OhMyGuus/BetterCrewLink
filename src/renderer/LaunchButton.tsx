import { ipcRenderer } from 'electron';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { GamePlatformInstance, GamePlatformMap } from '../common/GamePlatform';
import { SettingsContext } from './contexts';
import makeStyles from '@mui/styles/makeStyles';
import { IpcMessages } from '../common/ipc-messages';
import { Button, ClickAwayListener, MenuItem, MenuList, Paper, Popper } from '@mui/material';
import { ToggleButton } from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { CustomPlatformSettings } from './settings/CustomPlatformSettings';

const useStyles = makeStyles((theme) => ({
	button_group: {
		display: 'inline-flex',
		margin: '0px 10px',
	},
	button_primary: {
		color: 'white',
		background: 'none',
		padding: '2px 10px',
		borderRadius: '10px 0px 0px 10px',
		borderWidth: '4px 2px 4px 4px',
		borderStyle: 'solid',
		borderColor: 'white',
		fontSize: 24,
		outline: 'none',
		fontWeight: 500,
		fontFamily: '"Varela", sans-serif',
		'&:hover': {
			borderColor: '#00ff00',
			cursor: 'pointer',
		},
		textTransform: 'none',
	},
	button_dropdown: {
		'&.Mui-selected': {
			borderColor: '#00ff00',
		},
		color: 'white',
		background: 'none',
		padding: '0px 0px',
		borderRadius: '0px 10px 10px 0px',
		borderWidth: '4px 4px 4px 2px',
		borderStyle: 'solid',
		borderColor: 'white',
		'&:hover': {
			borderColor: '#00ff00',
			cursor: 'pointer',
		},
		minWidth: '40px',
	},
	dropdown: {
		maxHeight: 110,
		overflow: 'auto',
		border: '1px solid rgba(255, 255, 255, 0.3)',
		background: '#272727',
	},
}));

export interface LauncherProps {
	t: (key: string) => string;
}

const LaunchButton: React.FC<LauncherProps> = function ({ t }: LauncherProps) {
	const classes = useStyles();

	const [settings, setSettings] = useContext(SettingsContext);

	const [openMessage, setOpenMessage] = useState(<>{t('game.error_platform')}</>);
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const [launchPlatforms, setLaunchPlatforms] = useState<GamePlatformMap>();
	const [launchItemList, setLaunchItemList] = useState([] as JSX.Element[]);
	const [customPlatformOpen, setCustomPlatformOpen] = useState(false);
	const [customPlatformEdit, setCustomPlatformEdit] = useState((undefined as unknown) as GamePlatformInstance);

	const anchorRef = useRef(null);

	// Grab available platforms from main thread
	useEffect(() => {
		ipcRenderer
			.invoke(IpcMessages.REQUEST_PLATFORMS_AVAILABLE, settings.customPlatforms)
			.then((result: GamePlatformMap) => {
				setLaunchPlatforms(result);
			});
	}, [settings.customPlatforms]);

	// If launchPlatformSettings changes: select the first available platform and re-compute list of platforms
	useEffect(() => {
		if (!launchPlatforms) return;
		if (!launchPlatforms[settings.launchPlatform]) {
			for (const key in launchPlatforms) {
				setSettings('launchPlatform', key);
				break;
			}
		}

		// Generate an array of <MenuItem>'s from available platforms for dropdown
		const platformArray = Array.from(Object.keys(launchPlatforms)).reduce((filtered: JSX.Element[], key) => {
			const platform = launchPlatforms[key];
			const platformName = platform.default ? t(platform.translateKey) : platform.translateKey;
			filtered.push(
				<MenuItem
					key={platformName}
					onClick={() => {
						setSettings('launchPlatform', platform.key);
						setDropdownOpen(false);
					}}
					onContextMenu={() => {
						if (platform.default) {
							return;
						}
						setCustomPlatformEdit(platform);
						setDropdownOpen(false);
						setCustomPlatformOpen(true);
					}}
				>
					{platformName}
				</MenuItem>
			);
			return filtered;
		}, []);

		platformArray.push(
			<MenuItem
				key={t('platform.custom')}
				onClick={() => {
					setCustomPlatformEdit((undefined as unknown) as GamePlatformInstance);
					setDropdownOpen(false);
					setCustomPlatformOpen(true);
				}}
			>
				{t('platform.custom')}
			</MenuItem>
		);
		setLaunchItemList(platformArray);
	}, [launchPlatforms]);

	// Update button message when platform changes or no platforms are available (list empty)
	useEffect(() => {
		if (!launchPlatforms) return;
		if (launchItemList.length > 1) {
			setOpenMessage(<>{t(launchPlatforms[settings.launchPlatform].translateKey)}</>);
		} else {
			setOpenMessage(<>{t('game.error_platform')}</>);
		}
	}, [launchItemList, settings.launchPlatform]);

	return (
		<>
			<CustomPlatformSettings
				t={t}
				open={customPlatformOpen}
				setOpenState={setCustomPlatformOpen}
				editPlatform={customPlatformEdit}
			/>
			<div className={classes.button_group} ref={anchorRef}>
				<Button
					className={classes.button_primary}
					disabled={launchItemList.length === 1}
					onClick={() => {
						ipcRenderer.send(IpcMessages.OPEN_AMONG_US_GAME, launchPlatforms![settings.launchPlatform]);
					}}
				>
					{openMessage}
				</Button>
				<ToggleButton
					className={classes.button_dropdown}
					onClick={() => setDropdownOpen((status) => !status)}
					selected={dropdownOpen}
					value=""
				>
					<ArrowDropDownIcon />
				</ToggleButton>
			</div>
			<Popper
				open={dropdownOpen}
				anchorEl={anchorRef.current}
				placement="bottom-end"
				disablePortal={false}
				className={classes.dropdown}
				modifiers={[
					{
						name: "flip",
						options: {
							enabled: false,
						},
					},
					{
						name: "preventOverflow",
						options: {
							enabled: true,
							boundariesElement: 'viewport'
						},
					},
				]}
			>
				<Paper>
					<ClickAwayListener onClickAway={() => setDropdownOpen(false)}>
						<MenuList>{launchItemList}</MenuList>
					</ClickAwayListener>
				</Paper>
			</Popper>
		</>
	);
};

export default LaunchButton;
