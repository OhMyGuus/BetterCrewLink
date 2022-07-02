import {
	Button,
	Checkbox,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControlLabel,
	IconButton,
	Radio,
	RadioGroup,
	TextField,
} from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import React, { useMemo, useState, useEffect, useContext } from 'react';
import ChevronLeft from '@mui/icons-material/ArrowBack';
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
	radioGroup: {
		flexDirection: 'row',
	},
}));

export interface CustomPlatformSettingProps {
	t: (key: string) => string;
	open: boolean;
	setOpenState: (state: boolean) => void;
	editPlatform?: GamePlatformInstance;
}

export const CustomPlatformSettings: React.FC<CustomPlatformSettingProps> = function ({
	t,
	open,
	setOpenState,
	editPlatform,
}: CustomPlatformSettingProps) {
	const desktopPlatform = platform;

	const classes = useStyles();
	const [settings, setSettings] = useContext(SettingsContext);
	const [advanced, setAdvanced] = useState(false);

	const emptyCustomPlatform: GamePlatformInstance = {
		default: false,
		key: '',
		launchType: PlatformRunType.EXE,
		runPath: '',
		execute: [''],
		translateKey: '',
	};
	const [customPlatform, setCustomPlatform] = useState(emptyCustomPlatform);

	useEffect(() => {
		setCustomPlatform(editPlatform ? editPlatform : emptyCustomPlatform);
		if (editPlatform && editPlatform.execute.length > 1) {
			setAdvanced(true);
		} else {
			setAdvanced(false);
		}
	}, [open]);

	const setPlatformName = (name: string) => {
		setCustomPlatform((prevState) => ({ ...prevState, key: name, translateKey: name }));
	};

	const setPlatformRunType = (runType: PlatformRunType) => {
		setCustomPlatform((prevState) => ({ ...prevState, launchType: runType, runPath: '', execute: [''] }));
	};

	const setPlatformRun = (pathsString: string) => {
		if (customPlatform.launchType === PlatformRunType.EXE) {
			const exe = path.parse(pathsString);
			if (exe) {
				setCustomPlatform((prevState) => ({
					...prevState,
					runPath: exe.dir,
					execute: [exe.base].concat(...prevState.execute.slice(1)),
				}));
			} else {
				setCustomPlatform((prevState) => ({ ...prevState, runPath: '', execute: [''] }));
			}
		} else if (customPlatform.launchType === PlatformRunType.URI) {
			setCustomPlatform((prevState) => ({ ...prevState, runPath: pathsString }));
		}
	};

	const setPlatformArgs = (args: string) => {
		if (args === '') {
			setCustomPlatform((prevState) => ({ ...prevState, execute: [customPlatform.execute[0]] }));
		} else if (customPlatform.launchType === PlatformRunType.EXE) {
			setCustomPlatform((prevState) => ({
				...prevState,
				execute: [customPlatform.execute[0]].concat(...args.split(' ')),
			}));
		}
	};

	// Delete and re-add platform if we're editing
	const saveCustomPlatform = () => {
		if (editPlatform && settings.customPlatforms[editPlatform.key]) {
			const { [editPlatform.key]: remove, ...rest } = settings.customPlatforms;
			setSettings('customPlatforms', {
				...rest, 
				[customPlatform.key]: customPlatform,
			});
		} else {
			setSettings('customPlatforms', {
				...settings.customPlatforms,
				[customPlatform.key]: customPlatform,
			});
		}
	};

	const deleteCustomPlatform = () => {
		const { [customPlatform.key]: remove, ...rest } = settings.customPlatforms;
		setSettings('customPlatforms', rest);
	};

	const runInputs = useMemo(() => {
		if (customPlatform.launchType === PlatformRunType.EXE) {
			return (
				<>
					<TextField
						fullWidth
						label={t('settings.customplatforms.path')}
						value={customPlatform.execute[0] ? path.join(customPlatform.runPath, customPlatform.execute[0]) : ''}
						variant="outlined"
						color="primary"
						disabled={true}
					/>
					<Button variant="contained" component="label">
						{t('buttons.file_select')}
						<input
							accept={desktopPlatform === 'win32' ? '.exe' : '*'}
							type="file"
							hidden
							onChange={(ev) => {
								if (ev.target.files && ev.target.files.length > 0) {
									setPlatformRun(ev.target.files[0].path);
								} else {
									setPlatformRun('');
								}
							}}
						/>
					</Button>
					<FormControlLabel
						control={
							<Checkbox
								checked={advanced}
								onChange={(_, checked: boolean) => {
									setAdvanced(checked);
									if (!checked) {
										setPlatformArgs('');
									}
								}}
							/>
						}
						label={t('settings.customplatforms.advanced')}
					/>
					{advanced ? (
						<TextField
							fullWidth
							label={t('settings.customplatforms.arguments')}
							value={customPlatform.execute.slice(1).join(' ')}
							onChange={(ev) => setPlatformArgs(ev.target.value)}
							variant="outlined"
							color="primary"
						/>
					) : null}
				</>
			);
		} else {
			return (
				<>
					<TextField
						fullWidth
						label={t('settings.customplatforms.uri')}
						value={customPlatform.runPath}
						onChange={(ev) => setPlatformRun(ev.target.value)}
						variant="outlined"
						color="primary"
						disabled={false}
					/>
				</>
			);
		}
	}, [customPlatform, advanced]);

	return (
		<>
			<Dialog fullScreen open={open}>
				<div className={classes.header}>
					<DialogTitle>{t('settings.customplatforms.title')}</DialogTitle>
					<IconButton className={classes.back} size="small" onClick={() => setOpenState(false)}>
						<ChevronLeft htmlColor="#777" />
					</IconButton>
				</div>
				<DialogContent className={classes.dialog}>
					<TextField
						fullWidth
						spellCheck={false}
						label={t('settings.customplatforms.platform_title')}
						value={customPlatform.key}
						onChange={(ev) => setPlatformName(ev.target.value)}
						variant="outlined"
						color="primary"
						disabled={false}
					/>
					<RadioGroup
						className={classes.radioGroup}
						value={customPlatform.launchType}
						onChange={(ev) => {
							setPlatformRunType(ev.target.value as PlatformRunType);
						}}
					>
						<FormControlLabel label={PlatformRunType.EXE} value={PlatformRunType.EXE} control={<Radio />} />
						<FormControlLabel label={PlatformRunType.URI} value={PlatformRunType.URI} control={<Radio />} />
					</RadioGroup>
					{runInputs}
				</DialogContent>
				<DialogActions>
					<Button
						color="primary"
						onClick={() => {
							deleteCustomPlatform();
							setCustomPlatform(emptyCustomPlatform);
							setOpenState(false);
						}}
					>
						{t('buttons.delete')}
					</Button>
					<Button
						color="primary"
						onClick={() => {
							saveCustomPlatform();
							setCustomPlatform(emptyCustomPlatform);
							setOpenState(false);
						}}
					>
						{t('buttons.confirm')}
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
};
