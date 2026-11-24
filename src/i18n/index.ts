import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { messages } from "./messages";

const kaynaklar = {
  tr: {
    messages: messages.tr,
  },
  en: {
    messages: messages.en,
  },
  de: {
    messages: messages.de,
  },
  ar: {
    messages: messages.ar,
  },
  ru: {
    messages: messages.ru,
  },
};

i18n.use(initReactI18next).init({
  resources: kaynaklar,
  lng: "tr",
  fallbackLng: "tr",
  defaultNS: "messages",
  ns: ["messages"],
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;
