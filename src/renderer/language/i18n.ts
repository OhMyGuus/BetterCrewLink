// @ts-nocheck
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import languages from './languages';

i18n
	// .use(Backend)
	.use(initReactI18next) // pas
	.init({
		resources: languages,
		defaultLocale: 'en',
		fallbackLng: 'en',
		debug: false,
		interpolation: {
			escapeValue: false, // not needed for react!!
		},
	});

export default i18n;
