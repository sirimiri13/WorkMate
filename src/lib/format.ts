import { format, parseISO } from "date-fns";
import { currentLang, type Lang } from "../i18n";

const DATE_PATTERN: Record<Lang, { short: string; dayMonth: string }> = {
  vi: { short: "dd/MM/yyyy", dayMonth: "dd/MM" },
  en: { short: "MMM d, yyyy", dayMonth: "MMM d" },
};
const MONEY: Record<Lang, Intl.NumberFormat> = {
  vi: new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }),
  en: new Intl.NumberFormat("en-US", { style: "currency", currency: "VND", maximumFractionDigits: 0 }),
};

// Đọc ngôn ngữ lúc gọi, nên component cần re-render khi đổi ngôn ngữ (useTranslation lo việc này).
export const money = (n: number) => MONEY[currentLang()].format(Math.round(n));
export const shortDate = (iso: string) => format(parseISO(iso), DATE_PATTERN[currentLang()].short);
export const dayMonth = (iso: string) => format(parseISO(iso), DATE_PATTERN[currentLang()].dayMonth);

export const OCCASION_ICON = { birthday: "🎂", anniversary: "🏅", special: "🎉" } as const;
