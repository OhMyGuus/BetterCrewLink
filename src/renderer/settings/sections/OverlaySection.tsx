import React from 'react';
import { TFunction } from 'i18next';
import { ISettings } from '../../../common/ISettings';
import { SelectRow, SettingsSection, SwitchRow } from '../SettingsControls';

export interface OverlaySectionProps {
	t: TFunction;
	settings: ISettings;
	setSettings: <K extends keyof ISettings>(setting: K, value: ISettings[K]) => void;
}

const OverlaySection: React.FC<OverlaySectionProps> = function ({ t, settings, setSettings }) {
	const positions = ['hidden', 'top', 'bottom_left', 'right', 'right1', 'left', 'left1'];
	const positionLabels: Record<string, string> = {
		hidden: t('settings.overlay.locations.hidden'),
		top: t('settings.overlay.locations.top'),
		bottom_left: t('settings.overlay.locations.bottom'),
		right: t('settings.overlay.locations.right'),
		right1: t('settings.overlay.locations.right1'),
		left: t('settings.overlay.locations.left'),
		left1: t('settings.overlay.locations.left1'),
	};

	return (
		<SettingsSection title={t('settings.overlay.title')}>
			<SwitchRow
				label={t('settings.overlay.always_on_top')}
				checked={settings.alwaysOnTop}
				onChange={(checked) => setSettings('alwaysOnTop', checked)}
			/>
			<SwitchRow
				label={t('settings.overlay.enabled')}
				checked={settings.enableOverlay}
				onChange={(checked) => setSettings('enableOverlay', checked)}
			/>
			<SwitchRow
				label={t('settings.overlay.compact')}
				disabled={!settings.enableOverlay}
				checked={settings.compactOverlay}
				onChange={(checked) => setSettings('compactOverlay', checked)}
			/>
			<SwitchRow
				label={t('settings.overlay.meeting')}
				disabled={!settings.enableOverlay}
				checked={settings.meetingOverlay}
				onChange={(checked) => setSettings('meetingOverlay', checked)}
			/>
			<SelectRow
				label={t('settings.overlay.pos')}
				disabled={!settings.enableOverlay}
				value={settings.overlayPosition}
				options={positions.map((value) => ({ value, label: positionLabels[value] }))}
				onChange={(value) => setSettings('overlayPosition', value)}
			/>
		</SettingsSection>
	);
};

export default OverlaySection;
