import React, { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import { DialogContent, DialogTitle, DialogActions, Dialog, Button, TextField } from '@mui/material';
import { isHttpUri, isHttpsUri } from 'valid-url';

type URLInputProps = {
	t: (key: string) => string;
	initialURL: string;
	onValidURL: (url: string) => void;
	className: string;
};

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

const RawServerURLInput: React.FC<URLInputProps> = function ({ t, initialURL, onValidURL, className }: URLInputProps) {
	const [isValidURL, setURLValid] = useState(true);
	const [currentURL, setCurrentURL] = useState(initialURL);
	const [open, setOpen] = useState(false);

	useEffect(() => {
		setCurrentURL(initialURL);
	}, [initialURL]);

	function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
		const url = event.target.value.trim();
		setCurrentURL(url);
		if (validateServerUrl(url)) {
			setURLValid(true);
		} else {
			setURLValid(false);
		}
	}

	return (
		<>
			<Button variant="contained" color="secondary" onClick={() => setOpen(true)}>
				{t('settings.advanced.change_server')}
			</Button>
			<Dialog fullScreen open={open} onClose={() => setOpen(false)}>
				<div>
					<DialogTitle>{t('settings.advanced.change_server')}</DialogTitle>
				</div>
				<DialogContent className={className}>
					<TextField
						fullWidth
						error={!isValidURL}
						spellCheck={false}
						label={t('settings.advanced.voice_server')}
						value={currentURL}
						onChange={handleChange}
						variant="outlined"
						color="primary"
						helperText={isValidURL ? '' : t('settings.advanced.voice_server')}
					/>
					<Alert severity="error">{t('settings.advanced.voice_server_warning')}</Alert>
					<Button
						color="primary"
						variant="contained"
						onClick={() => {
							setOpen(false);
							setURLValid(true);
							onValidURL('https://bettercrewl.ink');
						}}
					>
						{t('settings.advanced.reset_default')}
					</Button>
				</DialogContent>
				<DialogActions>
					<Button
						color="primary"
						onClick={() => {
							setURLValid(true);
							setOpen(false);
							setCurrentURL(initialURL);
						}}
					>
						{t('buttons.cancel')}
					</Button>
					<Button
						disabled={!isValidURL}
						color="primary"
						onClick={() => {
							setOpen(false);
							let url = currentURL;
							if (url.endsWith('/')) url = url.substring(0, url.length - 1);
							onValidURL(url);
						}}
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
