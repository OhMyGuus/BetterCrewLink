import React from 'react';
import { TFunction } from 'i18next';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import { ISettings } from '../../../common/ISettings';
import MicrophoneSoundBar from '../MicrophoneSoundBar';
import TestSpeakersButton from '../TestSpeakersButton';
import { pushToTalkOptions } from '../SettingsStore';
import { ConfirmApi, SettingRow, SettingsSection, SliderRow } from '../SettingsControls';

export interface MediaDevice {
	id: string;
	kind: MediaDeviceKind;
	label: string;
}

interface DeviceSelectProps {
	value: string;
	options: { value: string; label: string }[];
	onChange: (value: string) => void;
	onOpen: () => void;
}

const DeviceSelect: React.FC<DeviceSelectProps> = function ({ value, options, onChange, onOpen }) {
	return (
		<TextField
			select
			fullWidth
			size="small"
			variant="outlined"
			color="secondary"
			value={value}
			slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
			onChange={(ev) => onChange(ev.target.value)}
			onClick={onOpen}
		>
			{options.map((option) => (
				<option key={option.value} value={option.value}>
					{option.label}
				</option>
			))}
		</TextField>
	);
};

export interface AudioSectionProps {
	t: TFunction;
	settings: ISettings;
	setSettings: <K extends keyof ISettings>(setting: K, value: ISettings[K]) => void;
	devices: MediaDevice[];
	refreshDevices: () => void;
	confirm: ConfirmApi['confirm'];
}

const AudioSection: React.FC<AudioSectionProps> = function ({
	t,
	settings,
	setSettings,
	devices,
	refreshDevices,
	confirm,
}) {
	const toOptions = (kind: MediaDeviceKind) =>
		devices.filter((device) => device.kind === kind).map((device) => ({ value: device.id, label: device.label }));

	return (
		<>
			<SettingsSection title={t('settings.audio.title')}>
				<SettingRow
					label={t('settings.audio.microphone')}
					control={
						<Stack sx={{ width: '100%' }} spacing={1}>
							<DeviceSelect
								value={settings.microphone}
								options={toOptions('audioinput')}
								onChange={(value) => setSettings('microphone', value)}
								onOpen={refreshDevices}
							/>
							<MicrophoneSoundBar microphone={settings.microphone} />
						</Stack>
					}
				/>
				<SettingRow
					label={t('settings.audio.speaker')}
					control={
						<Stack sx={{ width: '100%', alignItems: 'stretch' }} spacing={1}>
							<DeviceSelect
								value={settings.speaker}
								options={toOptions('audiooutput')}
								onChange={(value) => setSettings('speaker', value)}
								onOpen={refreshDevices}
							/>
							<TestSpeakersButton t={t} speaker={settings.speaker} />
						</Stack>
					}
				/>
			</SettingsSection>

			<SettingsSection title={t('settings.audio.mode')}>
				<Box sx={{ px: 2, py: 1 }}>
					<RadioGroup
						value={settings.pushToTalkMode}
						onChange={(ev) => setSettings('pushToTalkMode', Number(ev.target.value))}
					>
						<FormControlLabel
							label={t('settings.audio.voice_activity')}
							value={pushToTalkOptions.VOICE}
							control={<Radio size="small" />}
						/>
						<FormControlLabel
							label={t('settings.audio.push_to_talk')}
							value={pushToTalkOptions.PUSH_TO_TALK}
							control={<Radio size="small" />}
						/>
						<FormControlLabel
							label={t('settings.audio.push_to_mute')}
							value={pushToTalkOptions.PUSH_TO_MUTE}
							control={<Radio size="small" />}
						/>
					</RadioGroup>
				</Box>
			</SettingsSection>

			<SettingsSection title={t('settings.audio.microphone')}>
				<SliderRow
					label={t('settings.audio.microphone_volume')}
					value={settings.microphoneGain}
					max={300}
					step={2}
					format={(value) => `${value}%`}
					toggle={{
						checked: settings.microphoneGainEnabled,
						onChange: (checked) => setSettings('microphoneGainEnabled', checked),
					}}
					onChange={(value) => setSettings('microphoneGain', value)}
				/>
				<SliderRow
					label={t('settings.audio.microphone_sens')}
					value={+(1 - settings.micSensitivity).toFixed(2)}
					max={1}
					step={0.05}
					color={settings.micSensitivity < 0.3 ? 'primary' : 'secondary'}
					format={(value) => value.toFixed(2)}
					toggle={{
						checked: settings.micSensitivityEnabled,
						onChange: (checked) => setSettings('micSensitivityEnabled', checked),
					}}
					onChange={(value) =>
						confirm(
							t('settings.warning'),
							t('settings.audio.microphone_sens_warning'),
							() => setSettings('micSensitivity', 1 - value),
							value === 0.7 && settings.micSensitivity < 0.3
						)
					}
				/>
			</SettingsSection>

			<SettingsSection>
				<SliderRow
					label={t('settings.audio.mastervolume')}
					value={settings.masterVolume}
					max={200}
					format={(value) => `${value}%`}
					onChange={(value) => setSettings('masterVolume', value)}
				/>
				<SliderRow
					label={t('settings.audio.crewvolume')}
					value={settings.crewVolumeAsGhost}
					format={(value) => `${value}%`}
					onChange={(value) => setSettings('crewVolumeAsGhost', value)}
				/>
				<SliderRow
					label={t('settings.audio.ghostvolumeasimpostor')}
					value={settings.ghostVolumeAsImpostor}
					format={(value) => `${value}%`}
					onChange={(value) => setSettings('ghostVolumeAsImpostor', value)}
				/>
			</SettingsSection>
		</>
	);
};

export default AudioSection;
