import React from 'react';
import { TFunction } from 'i18next';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import { ILobbySettings } from '../../../common/ISettings';
import languages from '../../language/languages';
import { ConfirmApi, SelectRow, SettingRow, SettingsSection, SliderRow, SwitchRow } from '../SettingsControls';

export interface LobbySectionProps {
	t: TFunction;
	lobbySettings: ILobbySettings;
	canChange: boolean;
	disabledReason: string;
	update: (partial: Partial<ILobbySettings>) => void;
	confirm: ConfirmApi['confirm'];
}

const LobbySection: React.FC<LobbySectionProps> = function ({
	t,
	lobbySettings,
	canChange,
	disabledReason,
	update,
	confirm,
}) {
	const toggles: { key: keyof ILobbySettings; label: string }[] = [
		{ key: 'wallsBlockAudio', label: t('settings.lobbysettings.wallsblockaudio') },
		{ key: 'visionHearing', label: t('settings.lobbysettings.visiononly') },
		{ key: 'haunting', label: t('settings.lobbysettings.impostorshearsghost') },
		{ key: 'hearImpostorsInVents', label: t('settings.lobbysettings.hear_imposters_invents') },
		{ key: 'impostersHearImpostersInvent', label: t('settings.lobbysettings.private_talk_invents') },
		{ key: 'commsSabotage', label: t('settings.lobbysettings.comms_sabotage_audio') },
		{ key: 'hearThroughCameras', label: t('settings.lobbysettings.hear_through_cameras') },
		{ key: 'impostorRadioEnabled', label: t('settings.lobbysettings.impostor_radio') },
	];

	return (
		<>
			{!canChange && (
				<Alert severity="info" sx={{ mb: 2 }}>
					{disabledReason}
				</Alert>
			)}

			<SettingsSection title={t('settings.lobbysettings.title')}>
				<SliderRow
					label={
						lobbySettings.visionHearing
							? t('settings.lobbysettings.voicedistance_impostor')
							: t('settings.lobbysettings.voicedistance')
					}
					disabled={!canChange}
					disabledReason={disabledReason}
					value={lobbySettings.maxDistance}
					min={1}
					max={10}
					step={0.1}
					format={(value) => value.toFixed(1)}
					onChange={(maxDistance) => update({ maxDistance })}
				/>
				{toggles.map(({ key, label }) => (
					<SwitchRow
						key={key}
						label={label}
						disabled={!canChange}
						disabledReason={disabledReason}
						checked={lobbySettings[key] as boolean}
						onChange={(checked) => update({ [key]: checked } as Partial<ILobbySettings>)}
					/>
				))}
				<SwitchRow
					label={t('settings.lobbysettings.ghost_only')}
					description={t('settings.lobbysettings.ghost_only_warning')}
					disabled={!canChange}
					disabledReason={disabledReason}
					checked={lobbySettings.deadOnly}
					onChange={(checked) =>
						confirm(
							t('settings.warning'),
							t('settings.lobbysettings.ghost_only_warning'),
							() => update({ meetingGhostOnly: false, deadOnly: checked }),
							checked
						)
					}
				/>
				<SwitchRow
					label={t('settings.lobbysettings.meetings_only')}
					description={t('settings.lobbysettings.meetings_only_warning')}
					disabled={!canChange}
					disabledReason={disabledReason}
					checked={lobbySettings.meetingGhostOnly}
					onChange={(checked) =>
						confirm(
							t('settings.warning'),
							t('settings.lobbysettings.meetings_only_warning'),
							() => update({ meetingGhostOnly: checked, deadOnly: false }),
							checked
						)
					}
				/>
			</SettingsSection>

			<SettingsSection title={t('buttons.public_lobby')}>
				<SwitchRow
					label={t('settings.lobbysettings.public_lobby.enabled')}
					description={t('settings.lobbysettings.public_lobby.enable_warning')}
					disabled={!canChange}
					disabledReason={disabledReason}
					checked={lobbySettings.publicLobby_on}
					onChange={(checked) =>
						confirm(
							t('settings.warning'),
							t('settings.lobbysettings.public_lobby.enable_warning'),
							() => update({ publicLobby_on: checked }),
							checked
						)
					}
				/>
				<SettingRow
					label={t('settings.lobbysettings.public_lobby.title')}
					description={t('settings.lobbysettings.public_lobby.ban_warning')}
					disabled={!canChange}
					disabledReason={disabledReason}
					control={
						<TextField
							fullWidth
							size="small"
							spellCheck={false}
							variant="outlined"
							color="primary"
							disabled={!canChange}
							value={lobbySettings.publicLobby_title}
							onChange={(ev) => update({ publicLobby_title: ev.target.value })}
						/>
					}
				/>
				<SelectRow
					label={t('settings.lobbysettings.public_lobby.language')}
					disabled={!canChange}
					disabledReason={disabledReason}
					value={lobbySettings.publicLobby_language}
					options={Object.entries(languages).map(([key, value]) => ({ value: key, label: value.name }))}
					onChange={(value) => update({ publicLobby_language: value })}
				/>
			</SettingsSection>
		</>
	);
};

export default LobbySection;
