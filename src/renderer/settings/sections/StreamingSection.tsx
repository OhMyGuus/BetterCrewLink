import React, { useState } from 'react';
import { TFunction } from 'i18next';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Tooltip from '@mui/material/Tooltip';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { ISettings } from '../../../common/ISettings';
import { SettingRow, SettingsSection, SwitchRow } from '../SettingsControls';

export interface StreamingSectionProps {
	t: TFunction;
	settings: ISettings;
	setSettings: <K extends keyof ISettings>(setting: K, value: ISettings[K]) => void;
}

function obsUrl(settings: ISettings): string {
	const protocol = settings.serverURL.includes('https') ? 'https' : 'http';
	return (
		`${protocol}://obs.bettercrewlink.app/?compact=${settings.compactOverlay ? '1' : '0'}` +
		`&position=${settings.overlayPosition}&meeting=${settings.meetingOverlay ? '1' : '0'}` +
		`&secret=${settings.obsSecret}&server=${settings.serverURL}`
	);
}

const StreamingSection: React.FC<StreamingSectionProps> = function ({ t, settings, setSettings }) {
	const [copied, setCopied] = useState(false);
	const url = obsUrl(settings);

	const copy = () => {
		navigator.clipboard.writeText(url).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		});
	};

	return (
		<SettingsSection title={t('settings.streaming.title')}>
			<SwitchRow
				label={t('settings.streaming.hidecode')}
				checked={!settings.hideCode}
				onChange={(checked) => setSettings('hideCode', !checked)}
			/>
			<SwitchRow
				label={t('settings.streaming.obs_overlay')}
				checked={settings.obsOverlay}
				onChange={(checked) => {
					setSettings('obsOverlay', checked);
					if (!settings.obsSecret) {
						setSettings('obsSecret', Math.random().toString(36).substring(2, 11).toUpperCase());
					}
				}}
			/>
			{settings.obsOverlay && (
				<SettingRow
					label={t('settings.streaming.obs_url')}
					stack
					control={
						<TextField
							fullWidth
							size="small"
							spellCheck={false}
							value={url}
							variant="outlined"
							color="primary"
							slotProps={{
								input: {
									readOnly: true,
									endAdornment: (
										<InputAdornment position="end">
											<Tooltip title={t('settings.streaming.copy_url')}>
												<IconButton size="small" onClick={copy}>
													{copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
												</IconButton>
											</Tooltip>
										</InputAdornment>
									),
								},
							}}
						/>
					}
				/>
			)}
		</SettingsSection>
	);
};

export default StreamingSection;
