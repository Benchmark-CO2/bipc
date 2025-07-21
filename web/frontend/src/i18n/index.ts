import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import translationEN from './locales/en/translation.json';
import translationES from './locales/es/translation.json';
import translationPT from './locales/ptbr/translation.json';
// import translationRU from './locales/ru/translation.json';
void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: false,
    resources: {
      'en-US': { translation: translationEN },
      'pt-BR': { translation: translationPT },
      'es-ES': { translation: translationES },
    },
    defaultNS: 'translation',

    keySeparator: '.',
    ns: ['translation'],
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;