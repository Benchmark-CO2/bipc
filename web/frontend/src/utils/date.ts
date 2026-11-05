import { ptBR, type Translations } from "@/i18n/translations/pt-BR";
import { en } from "@/i18n/translations/en";

type DateKey = keyof Translations["utils"]["date"];

const translationsByLang: Record<"pt-BR" | "en", typeof ptBR> = {
  "pt-BR": ptBR as unknown as typeof ptBR,
  en: en as unknown as typeof ptBR,
};

function getLang(): "pt-BR" | "en" {
  try {
    const saved = localStorage.getItem("bipc:language");
    if (saved === "pt-BR" || saved === "en") return saved;
  } catch {
    // localStorage not available
  }
  return "pt-BR";
}

function extractPluralCase(casesRaw: string, targetKeyword: string): string {
  let i = 0;
  const len = casesRaw.length;
  while (i < len) {
    while (i < len && /\s/.test(casesRaw[i] ?? "")) i += 1;
    const keywordStart = i;
    while (i < len && /[a-zA-Z0-9=]/.test(casesRaw[i] ?? "")) i += 1;
    const keyword = casesRaw.slice(keywordStart, i);
    while (i < len && /\s/.test(casesRaw[i] ?? "")) i += 1;
    if (i < len && casesRaw[i] === "{") {
      i += 1;
      let depth = 1;
      const valueStart = i;
      while (i < len && depth > 0) {
        const c = casesRaw[i] ?? "";
        if (c === "{") depth += 1;
        if (c === "}") depth -= 1;
        i += 1;
      }
      const value = casesRaw.slice(valueStart, Math.max(valueStart, i - 1));
      if (keyword === targetKeyword) return value;
    } else {
      i += 1;
    }
  }
  return "";
}

function pluralize(input: string, count: number, lang: "pt-BR" | "en"): string {
  const match = input.match(
    /^\s*\{\s*(\w+)\s*,\s*plural\s*,\s*([\s\S]*)\}\s*$/,
  );

  if (!match) {
    return input
      .replace(/\{count\}/g, String(count))
      .replace(/\{#\}/g, String(count));
  }

  const casesRaw = match[2] ?? "";
  const isOne = lang === "pt-BR" ? count === 1 : count === 1;
  const key = isOne ? "one" : "other";
  const template = extractPluralCase(casesRaw, key) || input;

  return template
    .replace(/\{count\}/g, String(count))
    .replace(/\{#\}/g, String(count))
    .replace(/#/g, String(count));
}

function translateDateKey(key: DateKey, count: number): string {
  const lang = getLang();
  const translations = translationsByLang[lang];
  const template = translations.utils?.date?.[key] ?? "";
  return pluralize(template, count, lang) || `${count}`;
}

function calculateRelativeTime(date: Date): string {
  const now = new Date();
  const differenceMs = now.getTime() - date.getTime();
  const seconds = Math.floor(differenceMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return translateDateKey("daysAgo", days);
  }
  if (hours > 0) {
    return translateDateKey("hoursAgo", hours);
  }
  if (minutes > 0) {
    return translateDateKey("minutesAgo", minutes);
  }
  return translateDateKey("secondsAgo", Math.max(seconds, 0));
}

const ignoreTimezone = (date: Date): Date => {
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() + timezoneOffset);
};

export const dateUtils = {
  calculateRelativeTime,
  ignoreTimezone,
};
