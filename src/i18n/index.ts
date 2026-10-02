import { useSyncExternalStore } from "react";
import { de } from "./de";
import { en } from "./en";
import { fr } from "./fr";
import { uk, type MessageKey } from "./uk";

export type { MessageKey };
export const LANGUAGES = ["uk", "en", "fr", "de"] as const;
export type Language = (typeof LANGUAGES)[number];
export const LANGUAGE_NAMES: Record<Language, string> = {
  uk: "Українська",
  en: "English",
  fr: "Français",
  de: "Deutsch",
};
const LOCALES: Record<Language, string> = {
  uk: "uk-UA",
  en: "en-CA",
  fr: "fr-CA",
  de: "de-DE",
};
const dictionaries: Record<Language, Record<MessageKey, string>> = {
  uk,
  en,
  fr,
  de,
};
// The interface language is a device preference, not part of the synchronized workspace.
export const LANGUAGE_KEY = "jobsearch.language";

const supported = (value: unknown): value is Language =>
  LANGUAGES.includes(value as Language);

/** Choose the language for a first visit; an explicit choice always wins. */
export function detectLanguage(
  stored: string | null,
  browser: readonly string[],
  hasWorkspace: boolean,
): Language {
  if (supported(stored)) return stored;
  // The interface was Ukrainian-only before translations existed: keep it for returning users.
  if (hasWorkspace) return "uk";
  for (const tag of browser) {
    const base = tag.toLowerCase().split("-")[0];
    if (supported(base)) return base;
  }
  return "en";
}

function initialLanguage(): Language {
  if (typeof localStorage === "undefined") return "uk";
  try {
    const stored = localStorage.getItem(LANGUAGE_KEY);
    const hasWorkspace = Object.keys(localStorage).some((key) =>
      key.startsWith("jobsearch.") && key.includes("workspace."),
    );
    const language = detectLanguage(
      stored,
      typeof navigator === "undefined" ? [] : navigator.languages || [],
      hasWorkspace,
    );
    // Remember the detected value so later workspace data cannot change it.
    if (stored !== language) localStorage.setItem(LANGUAGE_KEY, language);
    return language;
  } catch {
    return "uk";
  }
}

let current: Language = initialLanguage();
const listeners = new Set<() => void>();

function applyToDocument() {
  if (typeof document === "undefined") return;
  document.documentElement.lang = current;
  document.title = `JobSearch — ${t("app.tagline")}`;
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute("content", t("app.description"));
}

export const getLanguage = (): Language => current;
export const locale = (): string => LOCALES[current];
export function setLanguage(language: Language) {
  if (!supported(language) || language === current) return;
  current = language;
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    // The choice still applies for this page view.
  }
  applyToDocument();
  listeners.forEach((listener) => listener());
}

/** Translate a message in the current language; `{name}` placeholders take values from params. */
export function t(
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  const template = dictionaries[current][key] ?? uk[key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in params ? String(params[name]) : placeholder,
  );
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
/** Re-render the calling component when the interface language changes. */
export function useI18n() {
  const language = useSyncExternalStore(subscribe, getLanguage, getLanguage);
  return { language, setLanguage, t };
}

applyToDocument();
