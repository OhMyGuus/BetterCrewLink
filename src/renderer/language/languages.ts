import translationEN from '../../../static/locales/en/translation.json'
import translationFR from '../../../static/locales/fr/translation.json'
import translationES from '../../../static/locales/es/translation.json'
import translationPTBR from '../../../static/locales/pt-BR/translation.json'
import translationSK from '../../../static/locales/sk/translation.json'
import translationNL from '../../../static/locales/nl/translation.json'
import translationDE from '../../../static/locales/de/translation.json'


const languages = {
	en: {
	  translation: translationEN,
	  name: 'English'
	},
	fr: {
		translation : translationFR,
		name: 'Français'
	},
	es: {
		translation : translationES,
		name: 'Español'
	},
	de: {
		translation : translationDE,
		name: 'Deutsch'
	},
	"pt-BR": {
		translation : translationPTBR,
		name: 'português (BR)'
	},
	sk: {
		translation : translationSK,
		name: 'Slovenčina'
	},
	nl: {
		translation : translationNL,
		name: 'Nederlands'
	}
  };

export default languages
