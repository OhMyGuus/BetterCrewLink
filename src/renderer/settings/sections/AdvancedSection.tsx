import React from 'react';
import { TFunction } from 'i18next';
import { ISettings } from '../../../common/ISettings';
import { ipcRenderer } from '../../lib/electron-bridge';
import ServerURLInput from '../ServerURLInput';
import { ConfirmApi, SettingRow, SettingsSection, SwitchRow } from '../SettingsControls';

export interface AdvancedSectionProps {
	t: TFunction;
	settings: ISettings;
	setSettings: <K extends keyof ISettings>(setting: K, value: ISettings[K]) => void;
	confirm: ConfirmApi['confirm'];
}

const AdvancedSection: React.FC<AdvancedSectionProps> = function ({ t, settings, setSettings, confirm }) {
	return (
		<>
			<SettingsSection title={t('settings.advanced.title')}>
				<SwitchRow
					label={t('settings.advanced.nat_fix')}
					description={t('settings.advanced.nat_fix_warning')}
					checked={settings.natFix}
					onChange={(checked) =>
						confirm(
							t('settings.warning'),
							t('settings.advanced.nat_fix_warning'),
							() => setSettings('natFix', checked),
							checked
						)
					}
				/>
				<SettingRow
					label={t('settings.advanced.voice_server')}
					description={settings.serverURL}
					controlWidth="auto"
					control={
						<ServerURLInput
							t={t}
							initialURL={settings.serverURL}
							onValidURL={(url) => setSettings('serverURL', url)}
							sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}
						/>
					}
				/>
			</SettingsSection>

			<SettingsSection title={t('settings.beta.title')}>
				<SwitchRow
					label={t('settings.beta.mobilehost')}
					checked={settings.mobileHost}
					onChange={(checked) => setSettings('mobileHost', checked)}
				/>
				<SwitchRow
					label={t('settings.beta.vad_enabled')}
					description={t('settings.beta.vad_enabled_warning')}
					checked={settings.vadEnabled}
					onChange={(checked) =>
						confirm(
							t('settings.warning'),
							t('settings.beta.vad_enabled_warning'),
							() => setSettings('vadEnabled', checked),
							!checked
						)
					}
				/>
				<SwitchRow
					label={t('settings.beta.hardware_acceleration')}
					description={t('settings.beta.hardware_acceleration_warning')}
					checked={settings.hardware_acceleration}
					onChange={(checked) =>
						confirm(
							t('settings.warning'),
							t('settings.beta.hardware_acceleration_warning'),
							() => {
								setSettings('hardware_acceleration', checked);
								ipcRenderer.send('relaunch');
							},
							!checked
						)
					}
				/>
				<SwitchRow
					label={t('settings.beta.echocancellation')}
					checked={settings.echoCancellation}
					onChange={(checked) => setSettings('echoCancellation', checked)}
				/>
				<SwitchRow
					label={t('settings.beta.spatial_audio')}
					checked={settings.enableSpatialAudio}
					onChange={(checked) => setSettings('enableSpatialAudio', checked)}
				/>
				<SwitchRow
					label={t('settings.beta.noiseSuppression')}
					checked={settings.noiseSuppression}
					onChange={(checked) => setSettings('noiseSuppression', checked)}
				/>
				<SwitchRow
					label={t('settings.beta.oldsampledebug')}
					description={t('settings.beta.oldsampledebug_warning')}
					checked={settings.oldSampleDebug}
					onChange={(checked) =>
						confirm(
							t('settings.warning'),
							t('settings.beta.oldsampledebug_warning'),
							() => setSettings('oldSampleDebug', checked),
							checked
						)
					}
				/>
			</SettingsSection>
		</>
	);
};

export default AdvancedSection;
