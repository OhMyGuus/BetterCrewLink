import { useEffect } from 'react';
import i18next from 'i18next';
import languages from './languages';
import { ipcRenderer } from '../lib/electron-bridge';
import { setSetting } from '../settings/SettingsStore';

async function resolveSystemLanguage(): Promise<string | undefined> {
	const locale = (await ipcRenderer.invoke('getlocale')) as string;
	const available = Object.keys(languages);
	if (available.includes(locale)) return locale;
	const base = locale.split('-')[0];
	return available.includes(base) ? base : undefined;
}

export function useLanguage(language: string | undefined, resolveSystemLocale = false): void {
	useEffect(() => {
		if (!language) return;
		if (language !== 'unkown') {
			i18next.changeLanguage(language);
			return;
		}
		if (!resolveSystemLocale) return;
		resolveSystemLanguage().then((resolved) => {
			if (!resolved) return;
			setSetting('language', resolved);
			i18next.changeLanguage(resolved);
		});
	}, [language, resolveSystemLocale]);
}
