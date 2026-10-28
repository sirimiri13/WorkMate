import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./en";
import { vi } from "./vi";

export const LANGS = ["vi", "en"] as const;
export type Lang = (typeof LANGS)[number];

const STORAGE_KEY = "workmate-lang";

function storedLang(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && (LANGS as readonly string[]).includes(v)) return v as Lang;
  } catch {
    // localStorage bị chặn: dùng mặc định.
  }
  return "vi";
}

i18n.use(initReactI18next).init({
  resources: { vi: { translation: vi }, en: { translation: en } },
  lng: storedLang(),
  fallbackLng: "vi",
  interpolation: { escapeValue: false }, // React đã tự escape.
});

const syncHtmlLang = (lng: string) => {
  document.documentElement.lang = lng;
};
syncHtmlLang(i18n.language);
i18n.on("languageChanged", (lng) => {
  syncHtmlLang(lng);
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    // bỏ qua
  }
});

export const currentLang = () => i18n.language as Lang;

export default i18n;
