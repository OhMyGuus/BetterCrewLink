import React, { ReactChild, useCallback, useContext, useEffect, useReducer, useState } from 'react';
import { SettingsContext, GameStateContext, HostSettingsContext } from '../contexts';
import MicrophoneSoundBar from './MicrophoneSoundBar';
import TestSpeakersButton from './TestSpeakersButton';
import { ISettings, ILobbySettings } from '../../common/ISettings';
import makeStyles from '@mui/styles/makeStyles';
import withStyles from '@mui/styles/withStyles';
import {
	Grid,
	RadioGroup,
	Checkbox,
	FormControlLabel,
	Box,
	Typography,
	IconButton,
	Button,
	Radio,
} from '@mui/material';
import { DialogContent, DialogContentText, DialogActions, DialogTitle, Slider, Tooltip } from '@mui/material';
import { Dialog, TextField } from '@mui/material';
import ChevronLeft from '@mui/icons-material/ArrowBack';
import Alert from '@mui/material/Alert';
import { GameState } from '../../common/AmongUsState';
import { ipcRenderer } from 'electron';
import { IpcHandlerMessages } from '../../common/ipc-messages';
import i18next, { TFunction } from 'i18next';
import languages from '../language/languages';
import ServerURLInput from './ServerURLInput';
import MuiDivider from '@mui/material/Divider';
import PublicLobbySettings from './PublicLobbySettings';
import SettingsStore, { pushToTalkOptions } from './SettingsStore';

interface StyleInput {
	open: boolean;
}

const Divider = withStyles((theme) => ({
	root: {
		width: '100%',
		marginTop: theme.spacing(2),
		marginBottom: theme.spacing(2),
	},
}))(MuiDivider);

const useStyles = makeStyles((theme) => ({
	root: {
		width: '100vw',
		height: `calc(100vh - ${theme.spacing(3)})`,
		background: '#171717ad',
		backdropFilter: 'blur(4px)',
		position: 'absolute',
		left: 0,
		top: 0,
		zIndex: 99,
		alignItems: 'center',
		marginTop: theme.spacing(3),
		transition: 'transform .1s ease-in-out',
		WebkitAppRegion: 'no-drag',
		transform: ({ open }: StyleInput) => (open ? 'translateX(0)' : 'translateX(-100%)'),
	},
	header: {
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
		height: 40,
	},
	scroll: {
		paddingTop: theme.spacing(1),
		paddingLeft: theme.spacing(2),
		paddingRight: theme.spacing(2),
		overflowY: 'auto',
		display: 'flex',
		flexDirection: 'column',
		justifyContent: 'start',
		alignItems: 'center',
		paddingBottom: theme.spacing(7),
		height: `calc(100vh - 40px - ${theme.spacing(7 + 3 + 3)})`,
	},
	shortcutField: {
		marginTop: theme.spacing(1),
	},
	back: {
		cursor: 'pointer',
		position: 'absolute',
		right: theme.spacing(1),
		WebkitAppRegion: 'no-drag',
	},
	alert: {
		position: 'absolute',
		bottom: theme.spacing(1),
		zIndex: 10,
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
	formLabel: {
		width: '100%',
		borderTop: '1px solid #313135',
		marginRight: '0px',
		// paddingBottom:'5px'
	},
}));

const keys = new Set([
	'CapsLock',
	'Space',
	'Backspace',
	'Delete',
	'Enter',
	'Up',
	'Down',
	'Left',
	'Right',
	'Home',
	'End',
	'PageUp',
	'PageDown',
	'Escape',
	'LShift',
	'RShift',
	'RAlt',
	'LAlt',
	'RControl',
	'LControl',
]);

export interface SettingsProps {
	t: TFunction;
	open: boolean;
	onClose: () => void;
}

interface MediaDevice {
	id: string;
	kind: MediaDeviceKind;
	label: string;
}

interface DisabledTooltipProps {
	disabled: boolean;
	title: string;
	children: ReactChild;
}

interface IConfirmDialog {
	confirmCallback?: () => void;
	description?: string;
	title?: string;
	open: boolean;
}

const DisabledTooltip: React.FC<DisabledTooltipProps> = function ({ disabled, children, title }: DisabledTooltipProps) {
	if (disabled)
		return (
			<Tooltip placement="top" arrow title={title}>
				<span>{children}</span>
			</Tooltip>
		);
	else return <>{children}</>;
};

const Settings: React.FC<SettingsProps> = function ({ t, open, onClose }: SettingsProps) {
	const classes = useStyles({ open });
	const [settings, setSettings, setLobbySettings] = useContext(SettingsContext);
	const gameState = useContext(GameStateContext);
	const [hostLobbySettings] = useContext(HostSettingsContext);
	const [unsavedCount, setUnsavedCount] = useState(0);
	const unsaved = unsavedCount > 1;

	// Used to buffer changes that are only sent out on settings close
	const [localLobbySettingsBuffer, setLocalLobbySettingsBuffer] = useState(settings.localLobbySettings);
	const updateLocalLobbySettingsBuffer = (newValues: Partial<ILobbySettings>) => setLocalLobbySettingsBuffer((oldState) => { return { ...oldState, ...newValues } });

	useEffect(() => {
		setUnsavedCount((s) => s + 1);
	}, [
		settings.microphone,
		settings.speaker,
		settings.serverURL,
		settings.vadEnabled,
		settings.hardware_acceleration,
		settings.natFix,
		settings.noiseSuppression,
		settings.oldSampleDebug,
		settings.echoCancellation,
		settings.mobileHost,
		settings.microphoneGainEnabled,
		settings.micSensitivityEnabled,
	]);

	useEffect(() => {
		ipcRenderer.send('setAlwaysOnTop', settings.alwaysOnTop);
	}, [settings.alwaysOnTop]);

	useEffect(() => {
		ipcRenderer.send('enableOverlay', settings.enableOverlay);
	}, [settings.enableOverlay]);

	const [devices, setDevices] = useState<MediaDevice[]>([]);
	const [_, updateDevices] = useReducer((state) => state + 1, 0);
	useEffect(() => {
		navigator.mediaDevices.enumerateDevices().then((devices) =>
			setDevices(
				devices.map((d) => {
					let label = d.label;
					if (d.deviceId === 'default') {
						label = t('buttons.default');
					} else {
						const match = /.+?\([^(]+\)/.exec(d.label);
						if (match && match[0]) label = match[0];
					}
					return {
						id: d.deviceId,
						kind: d.kind,
						label,
					};
				})
			)
		);
	}, [_]);

	const setShortcut = (ev: React.KeyboardEvent, shortcut: keyof ISettings) => {
		let k = ev.key;
		if (k.length === 1) k = k.toUpperCase();
		else if (k.startsWith('Arrow')) k = k.substring(5);
		if (k === ' ') k = 'Space';

		/* @ts-ignore */
		const c = ev.code as string;
		if (c && c.startsWith('Numpad')) {
			k = c;
		}

		if (k === 'Control' || k === 'Alt' || k === 'Shift') k = (ev.location === 1 ? 'L' : 'R') + k;

		if (/^[0-9A-Z]$/.test(k) || /^F[0-9]{1,2}$/.test(k) || keys.has(k) || k.startsWith('Numpad')) {
			if (k === 'Escape') {
				console.log('disable??');
				k = 'Disabled';
			}
			setSettings(shortcut, k);

			ipcRenderer.send(IpcHandlerMessages.RESET_KEYHOOKS);
		}
	};

	const setMouseShortcut = (ev: React.MouseEvent<HTMLDivElement>, shortcut: keyof ISettings) => {
		if (ev.button > 2) {
			// this makes our button start at 1 instead of 0
			// React Mouse event starts at 0, but IOHooks starts at 1
			const k = `MouseButton${ev.button + 1}`;
			setSettings(shortcut, k);
			ipcRenderer.send(IpcHandlerMessages.RESET_KEYHOOKS);
		}
	};

	const resetDefaults = () => {
		SettingsStore.clear();
		// This is necessary for resetting hotkeys properly, the main thread needs to be notified to reset the hooks
		ipcRenderer.send(IpcHandlerMessages.RESET_KEYHOOKS);

		location.reload();
	};

	const microphones = devices.filter((d) => d.kind === 'audioinput');
	const speakers = devices.filter((d) => d.kind === 'audiooutput');

	useEffect(() => {
		(async () => {
			console.log(settings.language);
			if (settings.language === 'unkown') {
				const locale: string = await ipcRenderer.invoke("getlocale");
				const lang = Object.keys(languages).includes(locale)
					? locale
					: Object.keys(languages).includes(locale.split('-')[0])
						? locale.split('-')[0]
						: undefined;
				if (lang) {
					settings.language = lang;
					setSettings('language', settings.language);
				}
			}
			i18next.changeLanguage(settings.language);
		})();
	}, [settings.language]);

	const isInMenuOrLobby = gameState?.gameState === GameState.LOBBY || gameState?.gameState === GameState.MENU;
	const canChangeLobbySettings =
		gameState?.gameState === GameState.MENU || (gameState?.isHost && gameState?.gameState === GameState.LOBBY);
	const canResetSettings =
		gameState?.gameState === undefined ||
		!gameState?.isHost ||
		gameState.gameState === GameState.MENU ||
		gameState.gameState === GameState.LOBBY;

	const [warningDialog, setWarningDialog] = React.useState({ open: false } as IConfirmDialog);

	const handleWarningDialogClose = (confirm: boolean) => {
		if (confirm && warningDialog.confirmCallback) {
			warningDialog.confirmCallback();
		}
		setWarningDialog({ open: false });
	};

	const openWarningDialog = (
		dialogTitle: string,
		dialogDescription: string,
		confirmCallback?: () => void,
		showDialog?: boolean
	) => {
		if (!showDialog) {
			if (confirmCallback) confirmCallback();
		} else {
			setWarningDialog({ title: dialogTitle, description: dialogDescription, open: true, confirmCallback });
		}
	};

	const URLInputCallback = useCallback((url: string) => {
		setSettings('serverURL', url);
	}, []);

	const SavePublicLobbyCallback = useCallback(<K extends keyof ILobbySettings>(setting: K, newValue: ILobbySettings[K]) => {
		// We want lobby browser related settings to save on Submit button click
		setLobbySettings(setting, newValue);
		const newSetting: Partial<ILobbySettings> = {};
		newSetting[setting] = newValue;
		updateLocalLobbySettingsBuffer(newSetting);
	}, []);

	if (!open) { return <></> }

	return (
		<Box className={classes.root}>
			<div className={classes.header}>
				<IconButton
					className={classes.back}
					size="small"
					onClick={() => {
						setSettings('localLobbySettings', localLobbySettingsBuffer);
						if (unsaved) {
							onClose();
							location.reload();
						} else onClose();
					}}
				>
					<ChevronLeft htmlColor="#777" />
				</IconButton>
				<Typography variant="h6">{t('settings.title')}</Typography>
			</div>
			<div className={classes.scroll}>
				{/* Lobby Settings */}
				<div>
					<Dialog
						open={warningDialog.open}
						onClose={handleWarningDialogClose}
						aria-labelledby="alert-dialog-title"
						aria-describedby="alert-dialog-description"
					>
						<DialogTitle id="alert-dialog-title">{warningDialog.title}</DialogTitle>
						<DialogContent>
							<DialogContentText id="alert-dialog-description">{warningDialog.description}</DialogContentText>
						</DialogContent>
						<DialogActions>
							<Button onClick={() => handleWarningDialogClose(true)} color="primary">
								{t('buttons.confirm')}
							</Button>
							<Button onClick={() => handleWarningDialogClose(false)} color="primary" autoFocus>
								{t('buttons.cancel')}
							</Button>
						</DialogActions>
					</Dialog>
				</div>

				<Typography variant="h6">{t('settings.lobbysettings.title')}</Typography>
				<div>
					<Typography id="input-slider" gutterBottom>
						{(canChangeLobbySettings ? localLobbySettingsBuffer.visionHearing : hostLobbySettings.visionHearing)
							? t('settings.lobbysettings.voicedistance_impostor')
							: t('settings.lobbysettings.voicedistance')}
						: {canChangeLobbySettings ? localLobbySettingsBuffer.maxDistance.toFixed(1) : hostLobbySettings.maxDistance.toFixed(1)}
					</Typography>
					<DisabledTooltip
						disabled={!canChangeLobbySettings}
						title={isInMenuOrLobby ? t('settings.lobbysettings.gamehostonly') : t('settings.lobbysettings.inlobbyonly')}
					>
						<Slider
							size="small"
							disabled={!canChangeLobbySettings}
							value={canChangeLobbySettings ? localLobbySettingsBuffer.maxDistance : hostLobbySettings.maxDistance}
							min={1}
							max={10}
							step={0.1}
							onChange={(_, newValue: number | number[]) => updateLocalLobbySettingsBuffer({ maxDistance: newValue as number })}
						/>
					</DisabledTooltip>
				</div>
				<div>
					<DisabledTooltip
						disabled={!canChangeLobbySettings}
						title={isInMenuOrLobby ? t('settings.lobbysettings.gamehostonly') : t('settings.lobbysettings.inlobbyonly')}
					>
						<FormControlLabel
							className={classes.formLabel}
							label={t('settings.lobbysettings.public_lobby.enabled')}
							disabled={!canChangeLobbySettings}
							onChange={(_, newValue: boolean) => {
								openWarningDialog(
									t('settings.warning'),
									t('settings.lobbysettings.public_lobby.enable_warning'),
									() => { updateLocalLobbySettingsBuffer({ publicLobby_on: newValue }) },
									!localLobbySettingsBuffer.publicLobby_on
								);
							}}
							value={canChangeLobbySettings ? localLobbySettingsBuffer.publicLobby_on : hostLobbySettings.publicLobby_on}
							checked={canChangeLobbySettings ? localLobbySettingsBuffer.publicLobby_on : hostLobbySettings.publicLobby_on}
							control={<Checkbox />}
						/>
					</DisabledTooltip>

					<DisabledTooltip
						disabled={!canChangeLobbySettings}
						title={isInMenuOrLobby ? t('settings.lobbysettings.gamehostonly') : t('settings.lobbysettings.inlobbyonly')}
					>
						<PublicLobbySettings
							t={t}
							updateSetting={SavePublicLobbyCallback}
							lobbySettings={canChangeLobbySettings ? localLobbySettingsBuffer : hostLobbySettings}
							canChange={canChangeLobbySettings}
							className={classes.dialog}
						/>
					</DisabledTooltip>

					<DisabledTooltip
						disabled={!canChangeLobbySettings}
						title={isInMenuOrLobby ? t('settings.lobbysettings.gamehostonly') : t('settings.lobbysettings.inlobbyonly')}
					>
						<FormControlLabel
							className={classes.formLabel}
							label={t('settings.lobbysettings.wallsblockaudio')}
							disabled={!canChangeLobbySettings}
							onChange={(_, newValue: boolean) => updateLocalLobbySettingsBuffer({ wallsBlockAudio: newValue })}
							value={canChangeLobbySettings ? localLobbySettingsBuffer.wallsBlockAudio : hostLobbySettings.wallsBlockAudio}
							checked={canChangeLobbySettings ? localLobbySettingsBuffer.wallsBlockAudio : hostLobbySettings.wallsBlockAudio}
							control={<Checkbox />}
						/>
					</DisabledTooltip>
					<DisabledTooltip
						disabled={!canChangeLobbySettings}
						title={isInMenuOrLobby ? t('settings.lobbysettings.gamehostonly') : t('settings.lobbysettings.inlobbyonly')}
					>
						<FormControlLabel
							className={classes.formLabel}
							label={t('settings.lobbysettings.visiononly')}
							disabled={!canChangeLobbySettings}
							onChange={(_, newValue: boolean) => updateLocalLobbySettingsBuffer({ visionHearing: newValue })}
							value={canChangeLobbySettings ? localLobbySettingsBuffer.visionHearing : hostLobbySettings.visionHearing}
							checked={canChangeLobbySettings ? localLobbySettingsBuffer.visionHearing : hostLobbySettings.visionHearing}
							control={<Checkbox />}
						/>
					</DisabledTooltip>
					<DisabledTooltip
						disabled={!canChangeLobbySettings}
						title={isInMenuOrLobby ? t('settings.lobbysettings.gamehostonly') : t('settings.lobbysettings.inlobbyonly')}
					>
						<FormControlLabel
							className={classes.formLabel}
							label={t('settings.lobbysettings.impostorshearsghost')}
							disabled={!canChangeLobbySettings}
							onChange={(_, newValue: boolean) => updateLocalLobbySettingsBuffer({ haunting: newValue })}
							value={canChangeLobbySettings ? localLobbySettingsBuffer.haunting : hostLobbySettings.haunting}
							checked={canChangeLobbySettings ? localLobbySettingsBuffer.haunting : hostLobbySettings.haunting}
							control={<Checkbox />}
						/>
					</DisabledTooltip>

					<DisabledTooltip
						disabled={!canChangeLobbySettings}
						title={isInMenuOrLobby ? t('settings.lobbysettings.gamehostonly') : t('settings.lobbysettings.inlobbyonly')}
					>
						<FormControlLabel
							className={classes.formLabel}
							label={t('settings.lobbysettings.hear_imposters_invents')}
							disabled={!canChangeLobbySettings}
							onChange={(_, newValue: boolean) => updateLocalLobbySettingsBuffer({ hearImpostorsInVents: newValue })}
							value={
								canChangeLobbySettings ? localLobbySettingsBuffer.hearImpostorsInVents : hostLobbySettings.hearImpostorsInVents
							}
							checked={
								canChangeLobbySettings ? localLobbySettingsBuffer.hearImpostorsInVents : hostLobbySettings.hearImpostorsInVents
							}
							control={<Checkbox />}
						/>
					</DisabledTooltip>
					<DisabledTooltip
						disabled={!canChangeLobbySettings}
						title={isInMenuOrLobby ? t('settings.lobbysettings.gamehostonly') : t('settings.lobbysettings.inlobbyonly')}
					>
						<FormControlLabel
							className={classes.formLabel}
							label={t('settings.lobbysettings.private_talk_invents')}
							disabled={!canChangeLobbySettings}
							onChange={(_, newValue: boolean) => updateLocalLobbySettingsBuffer({ impostersHearImpostersInvent: newValue })}
							value={
								canChangeLobbySettings
									? localLobbySettingsBuffer.impostersHearImpostersInvent
									: hostLobbySettings.impostersHearImpostersInvent
							}
							checked={
								canChangeLobbySettings
									? localLobbySettingsBuffer.impostersHearImpostersInvent
									: hostLobbySettings.impostersHearImpostersInvent
							}
							control={<Checkbox />}
						/>
					</DisabledTooltip>

					<DisabledTooltip
						disabled={!canChangeLobbySettings}
						title={isInMenuOrLobby ? t('settings.lobbysettings.gamehostonly') : t('settings.lobbysettings.inlobbyonly')}
					>
						<FormControlLabel
							className={classes.formLabel}
							label={t('settings.lobbysettings.comms_sabotage_audio')}
							disabled={!canChangeLobbySettings}
							onChange={(_, newValue: boolean) => updateLocalLobbySettingsBuffer({ commsSabotage: newValue })}
							value={canChangeLobbySettings ? localLobbySettingsBuffer.commsSabotage : hostLobbySettings.commsSabotage}
							checked={canChangeLobbySettings ? localLobbySettingsBuffer.commsSabotage : hostLobbySettings.commsSabotage}
							control={<Checkbox />}
						/>
					</DisabledTooltip>
					<DisabledTooltip
						disabled={!canChangeLobbySettings}
						title={isInMenuOrLobby ? t('settings.lobbysettings.gamehostonly') : t('settings.lobbysettings.inlobbyonly')}
					>
						<FormControlLabel
							className={classes.formLabel}
							label={t('settings.lobbysettings.hear_through_cameras')}
							disabled={!canChangeLobbySettings}
							onChange={(_, newValue: boolean) => updateLocalLobbySettingsBuffer({ hearThroughCameras: newValue })}
							value={canChangeLobbySettings ? localLobbySettingsBuffer.hearThroughCameras : hostLobbySettings.hearThroughCameras}
							checked={
								canChangeLobbySettings ? localLobbySettingsBuffer.hearThroughCameras : hostLobbySettings.hearThroughCameras
							}
							control={<Checkbox />}
						/>
					</DisabledTooltip>
					<DisabledTooltip
						disabled={!canChangeLobbySettings}
						title={isInMenuOrLobby ? t('settings.lobbysettings.gamehostonly') : t('settings.lobbysettings.inlobbyonly')}
					>
						<FormControlLabel
							className={classes.formLabel}
							label={t('settings.lobbysettings.impostor_radio')}
							disabled={!canChangeLobbySettings}
							onChange={(_, newValue: boolean) => updateLocalLobbySettingsBuffer({ impostorRadioEnabled: newValue })}
							value={
								canChangeLobbySettings ? localLobbySettingsBuffer.impostorRadioEnabled : hostLobbySettings.impostorRadioEnabled
							}
							checked={
								canChangeLobbySettings ? localLobbySettingsBuffer.impostorRadioEnabled : hostLobbySettings.impostorRadioEnabled
							}
							control={<Checkbox />}
						/>
					</DisabledTooltip>
					<DisabledTooltip
						disabled={!canChangeLobbySettings}
						title={isInMenuOrLobby ? t('settings.lobbysettings.gamehostonly') : t('settings.lobbysettings.inlobbyonly')}
					>
						<FormControlLabel
							className={classes.formLabel}
							label={t('settings.lobbysettings.ghost_only')}
							disabled={!canChangeLobbySettings}
							onChange={(_, newValue: boolean) => {
								console.log('new vlaue of setting: ', newValue);
								openWarningDialog(
									t('settings.warning'),
									t('settings.lobbysettings.ghost_only_warning'),
									() => updateLocalLobbySettingsBuffer({ meetingGhostOnly: false, deadOnly: newValue }),
									newValue
								);
							}}
							value={canChangeLobbySettings ? localLobbySettingsBuffer.deadOnly : hostLobbySettings.deadOnly}
							checked={canChangeLobbySettings ? localLobbySettingsBuffer.deadOnly : hostLobbySettings.deadOnly}
							control={<Checkbox />}
						/>
					</DisabledTooltip>
					<DisabledTooltip
						disabled={!canChangeLobbySettings}
						title={isInMenuOrLobby ? t('settings.lobbysettings.gamehostonly') : t('settings.lobbysettings.inlobbyonly')}
					>
						<FormControlLabel
							className={classes.formLabel}
							label={t('settings.lobbysettings.meetings_only')}
							disabled={!canChangeLobbySettings}
							onChange={(_, newValue: boolean) => {
								console.log('new vlaue of setting: ', newValue);
								openWarningDialog(
									t('settings.warning'),
									t('settings.lobbysettings.meetings_only_warning'),
									() => updateLocalLobbySettingsBuffer({ meetingGhostOnly: newValue, deadOnly: false }),
									newValue
								);
							}}
							value={canChangeLobbySettings ? localLobbySettingsBuffer.meetingGhostOnly : hostLobbySettings.meetingGhostOnly}
							checked={canChangeLobbySettings ? localLobbySettingsBuffer.meetingGhostOnly : hostLobbySettings.meetingGhostOnly}
							control={<Checkbox />}
						/>
					</DisabledTooltip>
					{/* </FormGroup> */}
				</div>
				<Divider />
				<Typography variant="h6">{t('settings.audio.title')}</Typography>
				<TextField
					select
					label={t('settings.audio.microphone')}
					variant="outlined"
					color="secondary"
					value={settings.microphone}
					className={classes.shortcutField}
					SelectProps={{ native: true }}
					InputLabelProps={{ shrink: true }}
					onChange={(ev) => setSettings('microphone', ev.target.value)}
					onClick={updateDevices}
				>
					{microphones.map((d) => (
						<option key={d.id} value={d.id}>
							{d.label}
						</option>
					))}
				</TextField>
				{open && <MicrophoneSoundBar microphone={settings.microphone} />}
				<TextField
					select
					label={t('settings.audio.speaker')}
					variant="outlined"
					color="secondary"
					value={settings.speaker}
					className={classes.shortcutField}
					SelectProps={{ native: true }}
					InputLabelProps={{ shrink: true }}
					onChange={(ev) => setSettings('speaker', ev.target.value)}
					onClick={updateDevices}
				>
					{speakers.map((d) => (
						<option key={d.id} value={d.id}>
							{d.label}
						</option>
					))}
				</TextField>
				{open && <TestSpeakersButton t={t} speaker={settings.speaker} />}
				<RadioGroup
					value={settings.pushToTalkMode}
					onChange={(ev) => {
						setSettings('pushToTalkMode', Number(ev.target.value));
					}}
				>
					<FormControlLabel
						label={t('settings.audio.voice_activity')}
						value={pushToTalkOptions.VOICE}
						control={<Radio />}
					/>
					<FormControlLabel
						label={t('settings.audio.push_to_talk')}
						value={pushToTalkOptions.PUSH_TO_TALK}
						control={<Radio />}
					/>
					<FormControlLabel
						label={t('settings.audio.push_to_mute')}
						value={pushToTalkOptions.PUSH_TO_MUTE}
						control={<Radio />}
					/>
				</RadioGroup>
				<Divider />

				<div>
					<Typography id="input-slider" gutterBottom>
						{t('settings.audio.microphone_volume')}
					</Typography>
					<Grid container spacing={2}>
						<Grid item xs={3}>
							<Checkbox
								checked={settings.microphoneGainEnabled}
								onChange={(_, checked: boolean) => setSettings('microphoneGainEnabled', checked)}
							/>
						</Grid>
						<Grid
							item
							xs={8}
							style={{
								display: 'flex',
								justifyContent: 'center',
								alignItems: 'center',
							}}
						>
							<Slider
								size="small"
								disabled={!settings.microphoneGainEnabled}
								value={settings.microphoneGain}
								valueLabelDisplay="auto"
								min={0}
								max={300}
								step={2}
								onChange={(_, newValue: number | number[]) => setSettings('microphoneGain', newValue as number)}
								aria-labelledby="input-slider"
							/>
						</Grid>
					</Grid>
					<Typography id="input-slider" gutterBottom>
						{t('settings.audio.microphone_sens')}
					</Typography>
					<Grid container spacing={2}>
						<Grid item xs={3}>
							<Checkbox
								checked={settings.micSensitivityEnabled}
								onChange={(_, checked: boolean) => setSettings('micSensitivityEnabled', checked)}
							/>
						</Grid>
						<Grid
							item
							xs={8}
							style={{
								display: 'flex',
								justifyContent: 'center',
								alignItems: 'center',
							}}
						>
							<Slider
								size="small"
								disabled={!settings.micSensitivityEnabled}
								value={+(1 - settings.micSensitivity).toFixed(2)}
								valueLabelDisplay="auto"
								min={0}
								max={1}
								color={settings.micSensitivity < 0.3 ? 'primary' : 'secondary'}
								step={0.05}
								onChange={(_, newValue: number | number[]) => {
									openWarningDialog(
										t('settings.warning'),
										t('settings.audio.microphone_sens_warning'),
										() => setSettings('micSensitivity', 1 - (newValue as number)),
										newValue == 0.7 && settings.micSensitivity < 0.3
									);
								}}
								aria-labelledby="input-slider"
							/>
						</Grid>
					</Grid>
					<Divider />

					<Typography id="input-slider" gutterBottom>
						{t('settings.audio.mastervolume')}
					</Typography>
					<Grid container direction="row" justifyContent="center" alignItems="center">
						<Grid item xs={11}>
							<Slider
								size="small"
								value={settings.masterVolume}
								valueLabelDisplay="auto"
								max={200}
								onChange={(_, newValue: number | number[]) => setSettings('masterVolume', newValue as number)}
								aria-labelledby="input-slider"
							/>
						</Grid>
					</Grid>
					<Typography id="input-slider" gutterBottom>
						{t('settings.audio.crewvolume')}
					</Typography>
					<Grid container direction="row" justifyContent="center" alignItems="center">
						<Grid item xs={11}>
							<Slider
								size="small"
								value={settings.crewVolumeAsGhost}
								valueLabelDisplay="auto"
								onChange={(_, newValue: number | number[]) => setSettings('crewVolumeAsGhost', newValue as number)}
								aria-labelledby="input-slider"
							/>
						</Grid>
					</Grid>
					<Typography id="input-slider" gutterBottom>
						{t('settings.audio.ghostvolumeasimpostor')}
					</Typography>
					<Grid container direction="row" justifyContent="center" alignItems="center">
						<Grid item xs={11}>
							<Slider
								size="small"
								value={settings.ghostVolumeAsImpostor}
								valueLabelDisplay="auto"
								onChange={(_, newValue: number | number[]) => setSettings('ghostVolumeAsImpostor', newValue as number)}
								aria-labelledby="input-slider"
							/>
						</Grid>
					</Grid>
				</div>
				<Divider />
				<Typography variant="h6">{t('settings.keyboard.title')}</Typography>
				<Grid container spacing={1}>
					<Grid item xs={6}>
						<TextField
							fullWidth
							spellCheck={false}
							color="secondary"
							label={t('settings.keyboard.push_to_talk')}
							value={settings.pushToTalkShortcut}
							className={classes.shortcutField}
							variant="outlined"
							onKeyDown={(ev) => {
								setShortcut(ev, 'pushToTalkShortcut');
							}}
							onMouseDown={(ev) => {
								setMouseShortcut(ev, 'pushToTalkShortcut');
							}}
						/>
					</Grid>
					<Grid item xs={6}>
						<TextField
							spellCheck={false}
							color="secondary"
							label={t('settings.keyboard.impostor_radio')}
							value={settings.impostorRadioShortcut}
							className={classes.shortcutField}
							variant="outlined"
							onKeyDown={(ev) => {
								setShortcut(ev, 'impostorRadioShortcut');
							}}
							onMouseDown={(ev) => {
								setMouseShortcut(ev, 'impostorRadioShortcut');
							}}
						/>
					</Grid>
					<Grid item xs={6}>
						<TextField
							spellCheck={false}
							color="secondary"
							label={t('settings.keyboard.mute')}
							value={settings.muteShortcut}
							className={classes.shortcutField}
							variant="outlined"
							onKeyDown={(ev) => {
								setShortcut(ev, 'muteShortcut');
							}}
							onMouseDown={(ev) => {
								setMouseShortcut(ev, 'muteShortcut');
							}}
						/>
					</Grid>
					<Grid item xs={6}>
						<TextField
							spellCheck={false}
							color="secondary"
							label={t('settings.keyboard.deafen')}
							value={settings.deafenShortcut}
							className={classes.shortcutField}
							variant="outlined"
							onKeyDown={(ev) => {
								setShortcut(ev, 'deafenShortcut');
							}}
							onMouseDown={(ev) => {
								setMouseShortcut(ev, 'deafenShortcut');
							}}
						/>
					</Grid>
				</Grid>

				<Divider />
				<Typography variant="h6">{t('settings.overlay.title')}</Typography>
				<div>
					<FormControlLabel
						className={classes.formLabel}
						label={t('settings.overlay.always_on_top')}
						checked={settings.alwaysOnTop}
						onChange={(_, checked: boolean) => setSettings('alwaysOnTop', checked)}
						control={<Checkbox />}
					/>
					<FormControlLabel
						className={classes.formLabel}
						label={t('settings.overlay.enabled')}
						checked={settings.enableOverlay}
						onChange={(_, checked: boolean) => setSettings('enableOverlay', checked)}
						control={<Checkbox />}
					/>
					{settings.enableOverlay && (
						<>
							<FormControlLabel
								className={classes.formLabel}
								label={t('settings.overlay.compact')}
								checked={settings.compactOverlay}
								onChange={(_, checked: boolean) => setSettings('compactOverlay', checked)}
								control={<Checkbox />}
							/>
							<FormControlLabel
								className={classes.formLabel}
								label={t('settings.overlay.meeting')}
								checked={settings.meetingOverlay}
								onChange={(_, checked: boolean) => setSettings('meetingOverlay', checked)}
								control={<Checkbox />}
							/>
							<TextField
								fullWidth
								select
								label={t('settings.overlay.pos')}
								variant="outlined"
								color="secondary"
								value={settings.overlayPosition}
								className={classes.shortcutField}
								SelectProps={{ native: true }}
								InputLabelProps={{ shrink: true }}
								onChange={(ev) => setSettings('overlayPosition', ev.target.value)}
								onClick={updateDevices}
							>
								<option value="hidden">{t('settings.overlay.locations.hidden')}</option>
								<option value="top">{t('settings.overlay.locations.top')}</option>
								<option value="bottom_left">{t('settings.overlay.locations.bottom')}</option>
								<option value="right">{t('settings.overlay.locations.right')}</option>
								<option value="right1">{t('settings.overlay.locations.right1')}</option>
								<option value="left">{t('settings.overlay.locations.left')}</option>
								<option value="left1">{t('settings.overlay.locations.left1')}</option>
							</TextField>
						</>
					)}
				</div>
				<Divider />
				<Typography variant="h6">{t('settings.advanced.title')}</Typography>
				<div>
					<FormControlLabel
						label={t('settings.advanced.nat_fix')}
						checked={settings.natFix}
						onChange={(_, checked: boolean) => {
							openWarningDialog(
								t('settings.warning'),
								t('settings.advanced.nat_fix_warning'),
								() => setSettings('natFix', checked),
								checked
							);
						}}
						control={<Checkbox />}
					/>
				</div>
				<ServerURLInput
					t={t}
					initialURL={settings.serverURL}
					onValidURL={URLInputCallback}
					className={classes.dialog}
				/>
				<Divider />
				<Typography variant="h6">{t('settings.beta.title')}</Typography>
				<div>
					<FormControlLabel
						className={classes.formLabel}
						label={t('settings.beta.mobilehost')}
						checked={settings.mobileHost}
						onChange={(_, checked: boolean) => setSettings('mobileHost', checked)}
						control={<Checkbox />}
					/>
					<FormControlLabel
						className={classes.formLabel}
						label={t('settings.beta.vad_enabled')}
						checked={settings.vadEnabled}
						onChange={(_, checked: boolean) => {
							openWarningDialog(
								t('settings.warning'),
								t('settings.beta.vad_enabled_warning'),
								() => setSettings('vadEnabled', checked),
								!checked
							);
						}}
						control={<Checkbox />}
					/>
					<FormControlLabel
						className={classes.formLabel}
						label={t('settings.beta.hardware_acceleration')}
						checked={settings.hardware_acceleration}
						onChange={(_, checked: boolean) => {
							openWarningDialog(
								t('settings.warning'),
								t('settings.beta.hardware_acceleration_warning'),
								() => {
									setSettings('hardware_acceleration', checked);
									ipcRenderer.send("relaunch");
								},
								!checked
							);
						}}
						control={<Checkbox />}
					/>
					<FormControlLabel
						className={classes.formLabel}
						label={t('settings.beta.echocancellation')}
						checked={settings.echoCancellation}
						onChange={(_, checked: boolean) => setSettings('echoCancellation', checked)}
						control={<Checkbox />}
					/>
					<FormControlLabel
						className={classes.formLabel}
						label={t('settings.beta.spatial_audio')}
						checked={settings.enableSpatialAudio}
						onChange={(_, checked: boolean) => setSettings('enableSpatialAudio', checked)}
						control={<Checkbox />}
					/>
					<FormControlLabel
						className={classes.formLabel}
						label={t('settings.beta.noiseSuppression')}
						checked={settings.noiseSuppression}
						onChange={(_, checked: boolean) => setSettings('noiseSuppression', checked)}
						control={<Checkbox />}
					/>
					<FormControlLabel
						className={classes.formLabel}
						label={t('settings.beta.oldsampledebug')}
						checked={settings.oldSampleDebug}
						onChange={(_, checked: boolean) => {
							openWarningDialog(
								t('settings.warning'),
								t('settings.beta.oldsampledebug_warning'),
								() => {
									setSettings('oldSampleDebug', checked);
								},
								checked
							);


						}}
						control={<Checkbox />}
					/>
				</div>
				<TextField
					fullWidth
					select
					label={t('settings.language')}
					variant="outlined"
					color="secondary"
					value={settings.language}
					className={classes.shortcutField}
					SelectProps={{ native: true }}
					InputLabelProps={{ shrink: true }}
					onChange={(ev) => setSettings('language', ev.target.value)}
				>
					{Object.entries(languages).map(([key, value]) => (
						<option key={key} value={key}>
							{value.name}
						</option>
					))}
				</TextField>
				<Divider />
				<Typography variant="h6">{t('settings.streaming.title')}</Typography>
				<div>
					<FormControlLabel
						className={classes.formLabel}
						label={t('settings.streaming.hidecode')}
						checked={!settings.hideCode}
						onChange={(_, checked: boolean) => setSettings('hideCode', !checked)}
						control={<Checkbox />}
					/>
					<FormControlLabel
						className={classes.formLabel}
						label={t('settings.streaming.obs_overlay')}
						checked={settings.obsOverlay}
						onChange={(_, checked: boolean) => {
							setSettings('obsOverlay', checked);
							if (!settings.obsSecret) {
								setSettings('obsSecret', Math.random().toString(36).substr(2, 9).toUpperCase());
							}
						}}
						control={<Checkbox />}
					/>
					{settings.obsOverlay && (
						<>
							<TextField
								fullWidth
								spellCheck={false}
								label={t('settings.streaming.obs_url')}
								value={`${settings.serverURL.includes('https') ? 'https' : 'http'}://obs.bettercrewlink.app/?compact=${settings.compactOverlay ? '1' : '0'
									}&position=${settings.overlayPosition}&meeting=${settings.meetingOverlay ? '1' : '0'}&secret=${settings.obsSecret
									}&server=${settings.serverURL}`}
								variant="outlined"
								color="primary"
								InputProps={{
									readOnly: true,
								}}
							/>
						</>
					)}
				</div>
				<Divider />
				<Typography variant="h6">{t('settings.troubleshooting.title')}</Typography>
				<div>
					<DisabledTooltip disabled={!canResetSettings} title={t('settings.troubleshooting.warning')}>
						<Button
							disabled={!canResetSettings}
							variant="contained"
							color="secondary"
							onClick={() =>
								openWarningDialog(
									t('settings.warning'),
									t('settings.troubleshooting.restore_warning'),
									() => resetDefaults(),
									true
								)
							}
						>
							{t('settings.troubleshooting.restore')}
						</Button>
					</DisabledTooltip>
				</div>
				<Alert className={classes.alert} severity="info" style={{ display: unsaved ? undefined : 'none' }}>
					{t('buttons.exit')}
				</Alert>
			</div>
		</Box>
	);
};

export default Settings;
