import React, { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import { DialogContent, DialogTitle, DialogActions, Dialog, Button, TextField } from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import { isHttpUri, isHttpsUri } from 'valid-url';

type URLInputProps = {
	t: (key: string) => string;
	initialURL: string;
	serverURLs: string[];
	onSaveURLs: (url: string, urls: string[]) => void;
	className: string;
};

const useStyles = makeStyles((theme) => ({
	dialogTitle: {
		padding: theme.spacing(2, 2, 1),
		'& h2, &.MuiDialogTitle-root': {
			fontSize: 20,
			lineHeight: '26px',
			fontWeight: 700,
		},
	},
	dialogContent: {
		boxSizing: 'border-box',
		padding: theme.spacing(0.5, 2, 0),
		overflowX: 'hidden',
		'& .MuiTextField-root': {
			marginTop: theme.spacing(0.75),
		},
		'& .MuiInputBase-root': {
			fontSize: 13,
		},
		'& .MuiInputLabel-root': {
			fontSize: 13,
		},
		'& .MuiAlert-root': {
			fontSize: 12,
			lineHeight: 1.25,
			padding: theme.spacing(0.5, 1),
		},
	},
	dialogActions: {
		padding: theme.spacing(0.5, 1.5, 1),
		justifyContent: 'space-between',
	},
}));

function validateServerUrl(uri: string): boolean {
	try {
		if (!isHttpUri(uri) && !isHttpsUri(uri)) return false;
		const url = new URL(uri);
		if (url.hostname === 'discord.gg') return false;
		if (url.pathname !== '/') return false;
		return true;
	} catch (_) {
		return false;
	}
}

function normalizeServerUrl(url: string): string {
	const trimmed = url.trim();
	return trimmed.endsWith('/') ? trimmed.substring(0, trimmed.length - 1) : trimmed;
}

function normalizeServerUrls(urls: string[]): string[] {
	return Array.from(new Set(urls.map(normalizeServerUrl).filter(validateServerUrl)));
}

const RawServerURLInput: React.FC<URLInputProps> = function ({
	t,
	initialURL,
	serverURLs,
	onSaveURLs,
	className,
}: URLInputProps) {
	const classes = useStyles();
	const [isValidURL, setURLValid] = useState(true);
	const [currentURL, setCurrentURL] = useState(initialURL);
	const [savedURLs, setSavedURLs] = useState(normalizeServerUrls(serverURLs.length ? serverURLs : [initialURL]));
	const [open, setOpen] = useState(false);

	useEffect(() => {
		setCurrentURL(initialURL);
	}, [initialURL]);

	useEffect(() => {
		setSavedURLs(normalizeServerUrls(serverURLs.length ? serverURLs : [initialURL]));
	}, [serverURLs, initialURL]);

	function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
		const url = event.target.value.trim();
		setCurrentURL(url);
		if (validateServerUrl(url)) {
			setURLValid(true);
		} else {
			setURLValid(false);
		}
	}

	function handleSelect(event: React.ChangeEvent<HTMLInputElement>) {
		const url = event.target.value;
		setCurrentURL(url);
		setURLValid(validateServerUrl(url));
	}

	function handleRemoveCurrentURL() {
		const normalizedURL = normalizeServerUrl(currentURL);
		const nextURLs = savedURLs.filter((url) => url !== normalizedURL);
		const fallbackURL = nextURLs[0] || 'https://bettercrewl.ink';
		const finalURLs = nextURLs.length ? nextURLs : [fallbackURL];
		setSavedURLs(finalURLs);
		setCurrentURL(fallbackURL);
		setURLValid(true);
		onSaveURLs(fallbackURL, finalURLs);
	}

	function handleSave() {
		const url = normalizeServerUrl(currentURL);
		const nextURLs = normalizeServerUrls([url, ...savedURLs]);
		setOpen(false);
		setSavedURLs(nextURLs);
		onSaveURLs(url, nextURLs);
	}

	return (
		<>
			<Button variant="contained" color="secondary" onClick={() => setOpen(true)}>
				{t('settings.advanced.change_server')}
			</Button>
			<Dialog fullScreen open={open} onClose={() => setOpen(false)}>
				<div>
					<DialogTitle className={classes.dialogTitle}>{t('settings.advanced.change_server')}</DialogTitle>
				</div>
				<DialogContent className={`${className} ${classes.dialogContent}`}>
					<TextField
						fullWidth
						select
						SelectProps={{ native: true }}
						label={t('settings.advanced.saved_voice_servers')}
						value={savedURLs.includes(normalizeServerUrl(currentURL)) ? normalizeServerUrl(currentURL) : ''}
						onChange={handleSelect}
						variant="outlined"
						color="primary"
					>
						{savedURLs.map((url) => (
							<option key={url} value={url}>
								{url}
							</option>
						))}
						<option value="">{t('settings.advanced.custom_voice_server')}</option>
					</TextField>
					<TextField
						fullWidth
						error={!isValidURL}
						spellCheck={false}
						label={t('settings.advanced.voice_server')}
						value={currentURL}
						onChange={handleChange}
						variant="outlined"
						color="primary"
						helperText={isValidURL ? '' : t('settings.advanced.invalid_url')}
					/>
					<Alert severity="error">{t('settings.advanced.voice_server_warning')}</Alert>
					<Button
						color="primary"
						variant="contained"
						onClick={() => {
							setOpen(false);
							setURLValid(true);
							setSavedURLs(['https://bettercrewl.ink']);
							onSaveURLs('https://bettercrewl.ink', ['https://bettercrewl.ink']);
						}}
					>
						{t('settings.advanced.reset_default')}
					</Button>
					<Button
						color="primary"
						variant="contained"
						disabled={savedURLs.length <= 1 || !savedURLs.includes(normalizeServerUrl(currentURL))}
						onClick={handleRemoveCurrentURL}
					>
						{t('settings.advanced.remove_voice_server')}
					</Button>
				</DialogContent>
				<DialogActions className={classes.dialogActions}>
					<Button
						color="primary"
						onClick={() => {
							setURLValid(true);
							setOpen(false);
							setCurrentURL(initialURL);
							setSavedURLs(normalizeServerUrls(serverURLs.length ? serverURLs : [initialURL]));
						}}
					>
						{t('buttons.cancel')}
					</Button>
					<Button
						disabled={!isValidURL}
						color="primary"
						onClick={handleSave}
					>
						{t('buttons.confirm')}
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
};

const ServerURLInput = React.memo(RawServerURLInput);

export default ServerURLInput;
