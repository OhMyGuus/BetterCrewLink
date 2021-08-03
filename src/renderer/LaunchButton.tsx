import { ipcRenderer } from 'electron';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { GamePlatformMap } from '../common/GamePlatform';
import { SettingsContext } from './contexts';
import makeStyles from '@material-ui/core/styles/makeStyles';
import { IpcMessages } from '../common/ipc-messages';
import { Button, ClickAwayListener, MenuItem, MenuList, Paper, Popper } from '@material-ui/core';
import { ToggleButton } from '@material-ui/lab';
import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';
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

	const anchorRef = useRef(null);

    const toggleDropdownOpen = () => {
		setDropdownOpen((status) => !status);
	};

    // Grab available platforms from main thread
	useEffect(() => {
		ipcRenderer.invoke(IpcMessages.REQUEST_PLATFORMS_AVAILABLE).then((result: GamePlatformMap) => {
			setLaunchPlatforms(result);
		});
	}, []);

	// If launchPlatformSettings changes: select the first available platform and re-compute list of platforms
	useEffect(() => {
		if (!launchPlatforms) return;
		if (!launchPlatforms[settings.launchPlatform]) {
			for (let key in launchPlatforms) {
                setSettings({
                    type: 'setOne',
                    action: ['launchPlatform', key],
                });
                break;
			}
		}

		// Generate an array of <MenuItem>'s from available platforms for dropdown
		let platformArray = Array.from(Object.keys(launchPlatforms)).reduce((filtered: JSX.Element[], key) => {
			const platform = launchPlatforms[key];
            const platformName = platform.default ? t(platform.translateKey) : platform.translateKey;
            filtered.push(
                <MenuItem
                    key={platformName}
                    onClick={() => {
                        setSettings({
                            type: 'setOne',
                            action: ['launchPlatform', platform.key],
                        });
                        toggleDropdownOpen();
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
                    setCustomPlatformOpen(true);
					// TODO: 
                    // In that page:
                        // Save -> add platform to settings customPlatforms
					toggleDropdownOpen();
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
            <CustomPlatformSettings t={t} open={customPlatformOpen} toggleOpen={() => {setCustomPlatformOpen((status) => !status)}} />
            <div className={classes.button_group} ref={anchorRef}>
            <Button
                className={classes.button_primary}
                disabled={launchItemList.length === 1}
                onClick={() => {
                    ipcRenderer.send(IpcMessages.OPEN_AMONG_US_GAME, settings.launchPlatform);
                }}
            >
                {openMessage}
            </Button>
            <ToggleButton
                className={classes.button_dropdown}
                onClick={toggleDropdownOpen}
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
                        <MenuList>{launchItemList}</MenuList>
                    </ClickAwayListener>
                </Paper>
            </Popper>
        </>
    )
}

export default LaunchButton;