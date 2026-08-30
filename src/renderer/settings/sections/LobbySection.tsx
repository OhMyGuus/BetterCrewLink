import React, { useState } from 'react';
import { TFunction } from 'i18next';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { AmongUsState } from '../../../common/AmongUsState';
import { ILobbySettings } from '../../../common/ISettings';
import languages from '../../language/languages';
import { defaultLobbySettings } from '../../voice/types';
import { ConfirmApi, SelectRow, SettingRow, SettingsSection, SliderRow, SwitchRow } from '../SettingsControls';

type LobbyTab = 'current' | 'mine';

export interface LobbySectionProps {
	t: TFunction;
	gameState: AmongUsState;
	activeLobbySettings: ILobbySettings | null;
	hostId: number;
	myLobbySettings: ILobbySettings;
	canEditMine: boolean;
	editDisabledReason: string;
	update: (partial: Partial<ILobbySettings>) => void;
	confirm: ConfirmApi['confirm'];
}

interface RowsProps {
	t: TFunction;
	values: ILobbySettings;
	disabled: boolean;
	disabledReason?: string;
	update: (partial: Partial<ILobbySettings>) => void;
	confirm: ConfirmApi['confirm'];
}

const LobbySettingRows: React.FC<RowsProps> = function ({ t, values, disabled, disabledReason, update, confirm }) {
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
			<SettingsSection title={t('settings.lobbysettings.title')}>
				<SliderRow
					label={
						values.visionHearing
							? t('settings.lobbysettings.voicedistance_impostor')
							: t('settings.lobbysettings.voicedistance')
					}
					disabled={disabled}
					disabledReason={disabledReason}
					value={values.maxDistance}
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
						disabled={disabled}
						disabledReason={disabledReason}
						checked={values[key] as boolean}
						onChange={(checked) => update({ [key]: checked } as Partial<ILobbySettings>)}
					/>
				))}
				<SwitchRow
					label={t('settings.lobbysettings.ghost_only')}
					description={t('settings.lobbysettings.ghost_only_warning')}
					disabled={disabled}
					disabledReason={disabledReason}
					checked={values.deadOnly}
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
					disabled={disabled}
					disabledReason={disabledReason}
					checked={values.meetingGhostOnly}
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
					disabled={disabled}
					disabledReason={disabledReason}
					checked={values.publicLobby_on}
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
					disabled={disabled}
					disabledReason={disabledReason}
					control={
						<TextField
							fullWidth
							size="small"
							spellCheck={false}
							variant="outlined"
							color="primary"
							disabled={disabled}
							value={values.publicLobby_title}
							onChange={(ev) => update({ publicLobby_title: ev.target.value })}
						/>
					}
				/>
				<SelectRow
					label={t('settings.lobbysettings.public_lobby.language')}
					disabled={disabled}
					disabledReason={disabledReason}
					value={values.publicLobby_language}
					options={Object.entries(languages).map(([key, value]) => ({ value: key, label: value.name }))}
					onChange={(value) => update({ publicLobby_language: value })}
				/>
			</SettingsSection>
		</>
	);
};

const noop = () => undefined;

const LobbySection: React.FC<LobbySectionProps> = function ({
	t,
	gameState,
	activeLobbySettings,
	hostId,
	myLobbySettings,
	canEditMine,
	editDisabledReason,
	update,
	confirm,
}) {
	const lobbyCode = gameState?.lobbyCode;
	const inLobby = activeLobbySettings !== null && !!lobbyCode && lobbyCode !== 'MENU';
	const iAmHost = !!gameState?.isHost;
	const [tab, setTab] = useState<LobbyTab>(inLobby && !gameState?.isHost ? 'current' : 'mine');

	const resolvedHostId = hostId || gameState?.hostId || 0;
	const hostName = iAmHost
		? t('settings.lobbysettings.host_you')
		: (gameState?.players?.find((player) => player.clientId === resolvedHostId)?.name ??
			t('settings.lobbysettings.host_unknown'));

	return (
		<>
			<Tabs
				value={tab}
				onChange={(_, value: LobbyTab) => setTab(value)}
				sx={{ mb: 2, minHeight: 36, borderBottom: '1px solid rgba(255,255,255,0.08)' }}
			>
				<Tab value="current" label={t('settings.lobbysettings.tab_current')} sx={{ minHeight: 36, py: 0 }} />
				<Tab value="mine" label={t('settings.lobbysettings.tab_mine')} sx={{ minHeight: 36, py: 0 }} />
			</Tabs>

			{tab === 'current' &&
				(inLobby ? (
					<>
						<SettingsSection>
							<SettingRow
								label={t('settings.lobbysettings.host')}
								description={
									iAmHost ? t('settings.lobbysettings.host_notice_you') : t('settings.lobbysettings.host_notice')
								}
								controlWidth="auto"
								control={
									<>
										<Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
											{hostName}
										</Typography>
										{iAmHost && (
											<Button size="small" variant="contained" color="secondary" onClick={() => setTab('mine')}>
												{t('settings.lobbysettings.edit_as_host')}
											</Button>
										)}
									</>
								}
							/>
						</SettingsSection>
						<LobbySettingRows t={t} values={activeLobbySettings} disabled update={noop} confirm={confirm} />
					</>
				) : (
					<Alert severity="info">{t('settings.lobbysettings.no_lobby')}</Alert>
				))}

			{tab === 'mine' && (
				<>
					<Alert severity={canEditMine ? 'info' : 'warning'} sx={{ mb: 2 }}>
						{canEditMine ? t('settings.lobbysettings.mine_notice') : editDisabledReason}
					</Alert>
					<LobbySettingRows
						t={t}
						values={myLobbySettings ?? defaultLobbySettings}
						disabled={!canEditMine}
						disabledReason={editDisabledReason}
						update={update}
						confirm={confirm}
					/>
				</>
			)}
		</>
	);
};

export default LobbySection;
