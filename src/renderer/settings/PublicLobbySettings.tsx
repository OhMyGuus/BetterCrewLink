import React, { useState, useEffect } from 'react';
import makeStyles from '@mui/styles/makeStyles';
import { DialogContent, DialogTitle, DialogActions, Dialog, Button, TextField, IconButton } from '@mui/material';
import languages from '../language/languages';
import { ILobbySettings } from '../../common/ISettings';
import Alert from '@mui/material/Alert';
import ChevronLeft from '@mui/icons-material/ArrowBack';

type publicLobbySettingProps = {
	t: (key: string) => string;
	updateSetting: <K extends keyof ILobbySettings>(setting: K, newValue: ILobbySettings[K]) => void;
	lobbySettings: ILobbySettings;
	canChange: boolean;
	className: string;
};

const useStyles = makeStyles((theme) => ({
	specialButton: {
		width: '90%',
		marginBottom: '10px',
	},
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
}));
const RawPublicLobbySettings: React.FC<publicLobbySettingProps> = function ({
	t,
	lobbySettings,
	updateSetting,
	canChange,
	className,
}: publicLobbySettingProps) {
	const [open, setOpen] = useState(false);
	const classes = useStyles();
	useEffect(() => {
		setLobbySettingState(lobbySettings);
	}, [lobbySettings]);

	const [lobbySettingState, setLobbySettingState] = useState(lobbySettings);

	return (
		<>
			<Button
				variant="contained"
				color="secondary"
				className={classes.specialButton}
				onClick={() => setOpen(true)}
				disabled={!canChange}
			>
				{t('settings.lobbysettings.public_lobby.change_settings')}
			</Button>
			<Dialog fullScreen open={open} onClose={() => setOpen(false)}>
				<div className={classes.header}>
					<DialogTitle>{t('settings.lobbysettings.public_lobby.change_settings')}</DialogTitle>
					<IconButton
						className={classes.back}
						size="small"
						onClick={() => {
							setOpen(false);
						}}
					>
						<ChevronLeft htmlColor="#777" />
					</IconButton>
				</div>
				<DialogContent className={className}>
					<TextField
						fullWidth
						spellCheck={false}
						label={t('settings.lobbysettings.public_lobby.title')}
						value={lobbySettingState.publicLobby_title}
						onChange={(ev) => setLobbySettingState({ ...lobbySettingState, publicLobby_title: ev.target.value })}
						onBlur={(ev) => updateSetting('publicLobby_title', ev.target.value)}
						variant="outlined"
						color="primary"
						disabled={!canChange}
					/>
					<TextField
						fullWidth
						select
						label={t('settings.lobbysettings.public_lobby.language')}
						variant="outlined"
						color="secondary"
						SelectProps={{ native: true }}
						InputLabelProps={{ shrink: true }}
						value={lobbySettingState.publicLobby_language}
						onChange={(ev) => setLobbySettingState({ ...lobbySettingState, publicLobby_language: ev.target.value })}
						onBlur={(ev) => updateSetting('publicLobby_language', ev.target.value)}
						disabled={!canChange}
					>
						{Object.entries(languages).map(([key, value]) => (
							<option key={key} value={key}>
								{value.name}
							</option>
						))}
					</TextField>

					<Alert severity="error">{t('settings.lobbysettings.public_lobby.ban_warning')}</Alert>
				</DialogContent>
				<DialogActions>
					<Button
						color="primary"
						onClick={() => {
							setOpen(false);
						}}
					>
						{t('buttons.confirm')}
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
};

const PublicLobbySettings = React.memo(RawPublicLobbySettings);

export default PublicLobbySettings;
