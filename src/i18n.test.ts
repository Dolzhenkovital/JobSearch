// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  detectLanguage,
  getLanguage,
  LANGUAGE_KEY,
  LANGUAGES,
  setLanguage,
  t,
} from "./i18n";
import { de } from "./i18n/de";
import { en } from "./i18n/en";
import { fr } from "./i18n/fr";
import { uk, type MessageKey } from "./i18n/uk";
import { createPacket, DOCUMENT_LANGUAGES, sourceLabel } from "./domain";
import type { Job, Profile } from "./types";

const dictionaries = { uk, en, fr, de };
const placeholders = (value: string) =>
  [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

afterEach(() => setLanguage("uk"));

describe("interface translations", () => {
  it("gives every language the same keys, placeholders and non-empty text", () => {
    const keys = Object.keys(uk).sort() as MessageKey[];
    for (const language of LANGUAGES) {
      const dictionary = dictionaries[language];
      expect(Object.keys(dictionary).sort()).toEqual(keys);
      for (const key of keys) {
        expect(dictionary[key].trim(), `${language}:${key}`).not.toBe("");
        expect(placeholders(dictionary[key]), `${language}:${key}`).toEqual(
          placeholders(uk[key]),
        );
      }
    }
  });

  it("leaves no Ukrainian text in the other dictionaries", () => {
    for (const language of ["en", "fr", "de"] as const)
      for (const [key, value] of Object.entries(dictionaries[language]))
        expect(/[а-яіїєґ]/i.test(value), `${language}:${key}`).toBe(false);
  });

  it("switches language, interpolates values and remembers the choice", () => {
    setLanguage("de");
    expect(getLanguage()).toBe("de");
    expect(t("nav.discover")).toBe("Stellen");
    expect(t("toast.imported", { count: 3 })).toBe("Importierte Stellen: 3");
    expect(t("results.fromHourly", { amount: "25" })).toBe("ab 25 $/Std.");
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe("de");
    expect(document.documentElement.lang).toBe("de");
    setLanguage("en");
    expect(t("results.fromHourly", { amount: "25" })).toBe("from $25/h");
    expect(sourceLabel("Додано вручну")).toBe("Added manually");
    expect(sourceLabel("Job Bank")).toBe("Job Bank");
  });

  it("detects the first-visit language without overriding an explicit choice", () => {
    expect(detectLanguage("fr", ["de-DE"], true)).toBe("fr");
    expect(detectLanguage(null, ["de-DE", "en"], false)).toBe("de");
    expect(detectLanguage(null, ["fr-CA"], false)).toBe("fr");
    expect(detectLanguage(null, ["es-ES"], false)).toBe("en");
    // Returning users of the Ukrainian-only version keep their interface.
    expect(detectLanguage(null, ["en-CA"], true)).toBe("uk");
    expect(detectLanguage("xx", ["uk-UA"], false)).toBe("uk");
  });
});

describe("German documents", () => {
  const job: Job = {
    id: "synthetic:de",
    title: "Sachbearbeiterin",
    employer: "Beispiel GmbH",
    location: "",
    salary: "",
    url: "",
    source: "Job Bank",
    description: "Synthetic full description.",
    completeness: "full",
    publishedAt: null,
    firstSeenAt: "2026-10-01T00:00:00.000Z",
    checkedAt: "2026-10-01T00:00:00.000Z",
    availability: "unknown",
  };
  const profile: Profile = {
    name: "Example Candidate",
    email: "",
    phone: "",
    headline: "",
    summary: "",
    skills: "",
    cv: "Synthetic CV text.",
    version: 1,
  };

  it("offers German and builds a German base letter", () => {
    expect(DOCUMENT_LANGUAGES).toContain("de");
    const packet = createPacket(job, profile, "de");
    expect(packet.letter).toContain("Sehr geehrte Damen und Herren,");
    expect(packet.letter).toContain(
      "die Stelle als Sachbearbeiterin bei Beispiel GmbH",
    );
    expect(packet.cv).toBe(profile.cv);
  });
});
