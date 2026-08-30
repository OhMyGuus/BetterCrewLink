import React, { useState } from 'react';
import { TFunction } from 'i18next';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import KeyboardIcon from '@mui/icons-material/Keyboard';
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

function describeShortcut(value: string, t: TFunction): string {
	if (!value || value === 'Disabled') return t('settings.keyboard.disabled');
	const mouse = /^MouseButton(\d+)$/.exec(value);
	if (mouse) return `Mouse ${mouse[1]}`;
	return value;
}

interface ShortcutFieldProps {
	value: string;
	recording: boolean;
	label: string;
	t: TFunction;
	onStartRecording: () => void;
	onStopRecording: () => void;
	onCapture: (key: string) => void;
}

const ShortcutField: React.FC<ShortcutFieldProps> = function ({
	value,
	recording,
	label,
	t,
	onStartRecording,
	onStopRecording,
	onCapture,
}) {
	const unset = !value || value === 'Disabled';
	return (
		<Box
			role="button"
			tabIndex={0}
			aria-label={label}
			onFocus={onStartRecording}
			onBlur={onStopRecording}
			onKeyDown={(ev) => {
				if (ev.key === 'Tab') return;
				ev.preventDefault();
				const captured = keyFromEvent(ev);
				if (captured) onCapture(captured);
			}}
			onMouseDown={(ev) => {
				if (recording && ev.button > 2) {
					ev.preventDefault();
					onCapture(`MouseButton${ev.button + 1}`);
					return;
				}
				if (ev.button !== 0) return;
				const focusStartedRecording = document.activeElement !== ev.currentTarget;
				if (focusStartedRecording) return;
				ev.preventDefault();
				if (recording) onStopRecording();
				else onStartRecording();
			}}
			sx={{
				width: '100%',
				minHeight: 34,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 0.75,
				px: 1.5,
				borderRadius: 1.5,
				cursor: 'pointer',
				userSelect: 'none',
				outline: 'none',
				fontFamily: 'Source Code Pro, monospace',
				fontSize: 13,
				fontWeight: 700,
				letterSpacing: 0.5,
				transition: 'border-color .15s ease, background-color .15s ease, color .15s ease',
				border: '1px solid',
				borderColor: recording ? 'primary.main' : 'rgba(255,255,255,0.18)',
				backgroundColor: recording ? 'rgba(206,147,216,0.14)' : 'rgba(0,0,0,0.25)',
				color: recording ? 'primary.main' : unset ? 'text.disabled' : 'text.primary',
				boxShadow: recording ? '0 0 0 3px rgba(206,147,216,0.16)' : 'inset 0 -2px 0 rgba(0,0,0,0.35)',
				'&:hover': {
					borderColor: recording ? 'primary.main' : 'rgba(255,255,255,0.38)',
				},
				'@keyframes shortcutPulse': {
					'0%, 100%': { opacity: 1 },
					'50%': { opacity: 0.45 },
				},
				animation: recording ? 'shortcutPulse 1.2s ease-in-out infinite' : 'none',
			}}
		>
			{recording ? (
				<>
					<KeyboardIcon sx={{ fontSize: 15 }} />
					{t('settings.keyboard.press_key')}
				</>
			) : (
				describeShortcut(value, t)
			)}
		</Box>
	);
};

const KeybindsSection: React.FC<KeybindsSectionProps> = function ({ t, settings, setShortcut }) {
	const [recording, setRecording] = useState<ShortcutSetting | null>(null);

	const shortcuts: { key: ShortcutSetting; label: string }[] = [
		{ key: 'pushToTalkShortcut', label: t('settings.keyboard.push_to_talk') },
		{ key: 'impostorRadioShortcut', label: t('settings.keyboard.impostor_radio') },
		{ key: 'muteShortcut', label: t('settings.keyboard.mute') },
		{ key: 'deafenShortcut', label: t('settings.keyboard.deafen') },
	];

	return (
		<>
			<Alert severity="info" icon={<KeyboardIcon fontSize="small" />} sx={{ mb: 2 }}>
				{t('settings.keyboard.hint')}
			</Alert>

			<SettingsSection title={t('settings.keyboard.title')}>
				{shortcuts.map(({ key, label }) => (
					<SettingRow
						key={key}
						label={label}
						controlWidth={200}
						control={
							<ShortcutField
								t={t}
								label={label}
								value={settings[key]}
								recording={recording === key}
								onStartRecording={() => setRecording(key)}
								onStopRecording={() => setRecording((current) => (current === key ? null : current))}
								onCapture={(captured) => {
									setShortcut(key, captured);
									setRecording(null);
								}}
							/>
						}
					/>
				))}
			</SettingsSection>
		</>
	);
};

export default KeybindsSection;
