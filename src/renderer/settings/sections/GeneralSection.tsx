import React from 'react';
import { TFunction } from 'i18next';
import Button from '@mui/material/Button';
import { ISettings } from '../../../common/ISettings';
import languages from '../../language/languages';
import { ConfirmApi, SelectRow, SettingRow, SettingsSection } from '../SettingsControls';

export interface GeneralSectionProps {
	t: TFunction;
	settings: ISettings;
	setSettings: <K extends keyof ISettings>(setting: K, value: ISettings[K]) => void;
	canResetSettings: boolean;
	resetDefaults: () => void;
	confirm: ConfirmApi['confirm'];
}

const GeneralSection: React.FC<GeneralSectionProps> = function ({
	t,
	settings,
	setSettings,
	canResetSettings,
	resetDefaults,
	confirm,
}) {
	return (
		<>
			<SettingsSection title={t('settings.general')}>
				<SelectRow
					label={t('settings.language')}
					value={settings.language}
					options={Object.entries(languages).map(([key, value]) => ({ value: key, label: value.name }))}
					onChange={(value) => setSettings('language', value)}
				/>
			</SettingsSection>

			<SettingsSection title={t('settings.troubleshooting.title')}>
				<SettingRow
					label={t('settings.troubleshooting.restore')}
					description={t('settings.troubleshooting.restore_warning')}
					disabled={!canResetSettings}
					disabledReason={t('settings.troubleshooting.warning')}
					controlWidth="auto"
					control={
						<Button
							disabled={!canResetSettings}
							variant="contained"
							color="secondary"
							size="small"
							onClick={() =>
								confirm(t('settings.warning'), t('settings.troubleshooting.restore_warning'), resetDefaults)
							}
						>
							{t('settings.troubleshooting.restore')}
						</Button>
					}
				/>
			</SettingsSection>
		</>
	);
};

export default GeneralSection;
