import React from 'react';
import { TFunction } from 'i18next';
import TextField from '@mui/material/TextField';
import { ISettings } from '../../../common/ISettings';
import { SettingRow, SettingsSection } from '../SettingsControls';

const namedKeys = new Set([
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

export type ShortcutSetting = 'pushToTalkShortcut' | 'impostorRadioShortcut' | 'muteShortcut' | 'deafenShortcut';

export interface KeybindsSectionProps {
	t: TFunction;
	settings: ISettings;
	setShortcut: (shortcut: ShortcutSetting, key: string) => void;
}

function keyFromEvent(ev: React.KeyboardEvent): string | undefined {
	let key = ev.key;
	if (key.length === 1) key = key.toUpperCase();
	else if (key.startsWith('Arrow')) key = key.substring(5);
	if (key === ' ') key = 'Space';

	const code = ev.code;
	if (code && code.startsWith('Numpad')) key = code;

	if (key === 'Control' || key === 'Alt' || key === 'Shift') key = (ev.location === 1 ? 'L' : 'R') + key;

	if (!/^[0-9A-Z]$/.test(key) && !/^F[0-9]{1,2}$/.test(key) && !namedKeys.has(key) && !key.startsWith('Numpad')) {
		return undefined;
	}
	return key === 'Escape' ? 'Disabled' : key;
}

const KeybindsSection: React.FC<KeybindsSectionProps> = function ({ t, settings, setShortcut }) {
	const shortcuts: { key: ShortcutSetting; label: string }[] = [
		{ key: 'pushToTalkShortcut', label: t('settings.keyboard.push_to_talk') },
		{ key: 'impostorRadioShortcut', label: t('settings.keyboard.impostor_radio') },
		{ key: 'muteShortcut', label: t('settings.keyboard.mute') },
		{ key: 'deafenShortcut', label: t('settings.keyboard.deafen') },
	];

	return (
		<SettingsSection title={t('settings.keyboard.title')}>
			{shortcuts.map(({ key, label }) => (
				<SettingRow
					key={key}
					label={label}
					controlWidth={200}
					control={
						<TextField
							fullWidth
							size="small"
							spellCheck={false}
							color="secondary"
							variant="outlined"
							value={settings[key]}
							slotProps={{ htmlInput: { readOnly: true, style: { textAlign: 'center', cursor: 'pointer' } } }}
							onKeyDown={(ev) => {
								const newKey = keyFromEvent(ev);
								if (newKey) setShortcut(key, newKey);
							}}
							onMouseDown={(ev) => {
								if (ev.button > 2) setShortcut(key, `MouseButton${ev.button + 1}`);
							}}
						/>
					}
				/>
			))}
		</SettingsSection>
	);
};

export default KeybindsSection;
