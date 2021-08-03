import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, Radio, RadioGroup, TextField } from '@material-ui/core';
import makeStyles from '@material-ui/core/styles/makeStyles';
import React, { useMemo, useState, useEffect } from 'react';
import ChevronLeft from '@material-ui/icons/ArrowBack';
import { GamePlatformInstance, PlatformRunType } from '../../common/GamePlatform';
import path from 'path';
import { platform } from 'process';


const useStyles = makeStyles((theme) => ({
	header: {
		display: 'flex',
		alignItems: 'center',
	},
	back: {
		cursor: 'pointer',
		position: 'absolute',
		right: theme.spacing(1),
		WebkitAppRegion: 'no-drag',
	},
    dialog: {
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'start',
		'&>*': {
			marginBottom: theme.spacing(1),
		},
	},
    fileSelectButton: {
		marginBottom: '0',
	},
    radioGroup: {
        flexDirection: 'row',
    },
}));

export interface CustomPlatformSettingProps {
	t: (key: string) => string;
    open: boolean;
    toggleOpen: () => void;
    editPlatform?: GamePlatformInstance;
}

export const CustomPlatformSettings: React.FC<CustomPlatformSettingProps> = function ({ t, open, toggleOpen, editPlatform }: CustomPlatformSettingProps) {
	const classes = useStyles();

    const [desktopPlatform, setDesktopPlatform] = useState('win32');
    useEffect(() => {
        setDesktopPlatform(platform);
    }, []);

    const emptyCustomPlatform: GamePlatformInstance = {
        default: false,
        key: '',
        launchType: PlatformRunType.EXE,
        runPath: '',
        exeFile: '',
        translateKey: '',
    };

    const [customPlatform, setCustomPlatform] = useState(editPlatform ? editPlatform : emptyCustomPlatform)

    // TODO: FIXME: Remove this
    useEffect(() => {
        console.log(customPlatform);
    }, [customPlatform]);

    const setPlatformName = (name: string) => {
        setCustomPlatform({...customPlatform, key: name, translateKey: name});
    }

    const setRun = (pathsString: string) => {
        if (customPlatform.launchType === PlatformRunType.EXE) {
            const exe = path.parse(pathsString);
            if (exe) {
                setCustomPlatform({...customPlatform, runPath: exe.dir, exeFile: exe.base});
            } else {
                setCustomPlatform({...customPlatform, runPath: '', exeFile: ''});
            }
        } else if (customPlatform.launchType === PlatformRunType.URI) {
            setCustomPlatform({...customPlatform, runPath: pathsString});
        }
    }

    const changeRunType = (runType: PlatformRunType) => {
        setCustomPlatform({...customPlatform, launchType: runType, runPath: '', exeFile: ''});
    }

    const runInputs = useMemo(() => {
		if (customPlatform.launchType === PlatformRunType.EXE) {
            return (<>
                <TextField
                    fullWidth
                    label={t('settings.customplatforms.path')}
                    value={customPlatform.runPath + customPlatform.exeFile}
                    variant='outlined'
                    color='primary'
                    disabled={true}
                />
                <Button
                    className={classes.fileSelectButton}
                    variant='contained'
                    component='label'
                >
                    Select file
                    <input
                        accept={desktopPlatform === 'win32' ? '.exe' : '*'}
                        type='file'
                        hidden
                        onChange={(ev) => {
                            if (ev.target.files) {
                                // console.log(ev.target.files[0].path);
                                setRun(ev.target.files[0].path);
                            } else {
                                setRun('');
                            }
                        }
                    }
                    />
                </Button></>
            );
        } else {
            return (<>
                <TextField
                    fullWidth
                    label={t('settings.customplatforms.uri')}
                    value={customPlatform.runPath}
                    onChange={(ev) => setRun(ev.target.value)}
                    variant='outlined'
                    color='primary'
                    disabled={false}
                />
            </>);
        }
	}, [customPlatform.launchType, customPlatform.runPath]);

	return (
		<>
			<Dialog fullScreen open={open}>
            {/* <Dialog fullScreen open={open} onClose={() => setOpen(false)}> */}
				<div className={classes.header}>
					<DialogTitle>{t('settings.customplatforms.title')}</DialogTitle>
					<IconButton
						className={classes.back}
						size='small'
						onClick={toggleOpen}
					>
						<ChevronLeft htmlColor='#777' />
					</IconButton>
				</div>
				<DialogContent className={classes.dialog}>
					<TextField
						fullWidth
						spellCheck={false}
						label={t('settings.customplatforms.platform_title')}
						value={customPlatform.key}
						onChange={(ev) => setPlatformName(ev.target.value)}
						variant='outlined'
						color='primary'
                        disabled={false}
					/>
                    <RadioGroup
                        className={classes.radioGroup}
                        value={customPlatform.launchType}
                        onChange={(ev) => {
                            changeRunType(ev.target.value as PlatformRunType);
                        }}
                    >
                        <FormControlLabel
                            label={PlatformRunType.EXE}
                            value={PlatformRunType.EXE}
                            control={<Radio />}
                        />
                        <FormControlLabel
                            label={PlatformRunType.URI}
                            value={PlatformRunType.URI}
                            control={<Radio />}
                        />
                    </RadioGroup>
                    {runInputs}
				</DialogContent>
				<DialogActions>
					<Button
						color='primary'
						onClick={() => {
                            // TODO: Add custom platform to settings, reset it, close
                            toggleOpen();
						}}
					>
						{t('buttons.confirm')}
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
};