import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, Radio, RadioGroup, TextField } from '@material-ui/core';
import makeStyles from '@material-ui/core/styles/makeStyles';
import React, { useMemo, useState, useEffect, useContext } from 'react';
import ChevronLeft from '@material-ui/icons/ArrowBack';
import { GamePlatformInstance, PlatformRunType } from '../../common/GamePlatform';
import path from 'path';
import { platform } from 'process';
import { SettingsContext } from '../contexts';


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
    const [settings, setSettings] = useContext(SettingsContext);
    const [desktopPlatform, setDesktopPlatform] = useState('win32');

    const makeEmptyCustomPlatform = {
        default: false,
        key: '',
        launchType: PlatformRunType.EXE,
        runPath: '',
        exeFile: '',
        translateKey: ''
    };
    const [customPlatform, setCustomPlatform] = useState(editPlatform ? editPlatform : makeEmptyCustomPlatform)

    useEffect(() => {
        setDesktopPlatform(platform);
    }, []);

    useEffect(() => {
        setCustomPlatform(editPlatform ? editPlatform : makeEmptyCustomPlatform);
    }, [open]);

    const setPlatformName = (name: string) => {
        setCustomPlatform((prevState) => ({...prevState, key: name, translateKey: name}));
    }

    const setPlatformRunType = (runType: PlatformRunType) => {
        setCustomPlatform((prevState) => ({...prevState, launchType: runType, runPath: '', exeFile: ''}));
    }

    const setPlatformRun = (pathsString: string) => {
        if (customPlatform.launchType === PlatformRunType.EXE) {
            const exe = path.parse(pathsString);
            if (exe) {
                setCustomPlatform((prevState) => ({...prevState, runPath: exe.dir, exeFile: exe.base}));
            } else {
                setCustomPlatform((prevState) => ({...prevState, runPath: '', exeFile: ''}));
            }
        } else if (customPlatform.launchType === PlatformRunType.URI) {
            setCustomPlatform((prevState) => ({...prevState, runPath: pathsString}));
        }
    }

    const saveCustomPlatform = () => {
        if (editPlatform && (settings.customPlatforms[editPlatform.key])) {
            const {[editPlatform.key]: remove, ...rest} = settings.customPlatforms;
            setSettings({
                type: 'setOne',
                action: ['customPlatforms', {
                    ...rest,
                    [customPlatform.key]: customPlatform,
                }],
            });
        } else {
            setSettings({
                type: 'setOne',
                action: ['customPlatforms', {
                    ...settings.customPlatforms,
                    [customPlatform.key]: customPlatform,
                }],
            });
        }
    }

    const deleteCustomPlatform = () => {
        const {[customPlatform.key]: remove, ...rest} = settings.customPlatforms;
        setSettings({
            type: 'setOne',
            action: ['customPlatforms', rest],
        });
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
                    {t('buttons.file_select')}
                    <input
                        accept={desktopPlatform === 'win32' ? '.exe' : '*'}
                        type='file'
                        hidden
                        onChange={(ev) => {
                            if ((ev.target.files) && (ev.target.files.length > 0)) {
                                setPlatformRun(ev.target.files[0].path);
                            } else {
                                setPlatformRun('');
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
                    onChange={(ev) => setPlatformRun(ev.target.value)}
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
                            setPlatformRunType(ev.target.value as PlatformRunType);
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
                            deleteCustomPlatform();
                            setCustomPlatform(makeEmptyCustomPlatform);
                            toggleOpen();
						}}
					>
						{t('buttons.delete')}
					</Button>
					<Button
						color='primary'
						onClick={() => {
                            saveCustomPlatform();
                            setCustomPlatform(makeEmptyCustomPlatform);
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