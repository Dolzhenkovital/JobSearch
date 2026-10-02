// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  combineJobs,
  createPacket,
  initialStore,
  matchingTerms,
  parseAtom,
  parseBackup,
  preferenceReasons,
  safeUrl,
} from "./domain";
import { syncDecision } from "./cloud";
import type { Job } from "./types";

const job: Job = {
  id: "jobbank:123",
  title: "Office coordinator",
  employer: "Example Co",
  location: "Laval (QC)",
  salary: "$25 hourly",
  url: "https://www.jobbank.gc.ca/jobsearch/jobposting/123",
  source: "Job Bank",
  description: "Excel and customer service. French required.",
  completeness: "full",
  publishedAt: null,
  firstSeenAt: "2026-10-01T12:00:00Z",
  checkedAt: "2026-10-01T12:00:00Z",
  availability: "unknown",
};

describe("candidate evidence and job handling", () => {
  it("does not let language requirements or language skills affect matching", () => {
    const profile = {
      ...initialStore().profile,
      skills: "Excel, French, English",
    };
    expect(matchingTerms(job, profile)).toEqual(["Excel"]);
    expect(
      matchingTerms(
        {
          ...job,
          description: "English required. Excel and customer service.",
        },
        profile,
      ),
    ).toEqual(["Excel"]);
    const settings = {
      ...initialStore().settings,
      roles: "Office coordinator",
    };
    expect(
      preferenceReasons(
        { ...job, title: "Bilingual Office coordinator" },
        settings,
      ),
    ).toEqual([]);
  });
  it("excludes language names written in Ukrainian or German as well", () => {
    const profile = {
      ...initialStore().profile,
      skills: "Excel, Англійська, Німецька, Deutsch, Französisch",
    };
    expect(
      matchingTerms(
        {
          ...job,
          description:
            "Excel. Англійська та німецька мови. Deutsch und Französisch erforderlich.",
        },
        profile,
      ),
    ).toEqual(["Excel"]);
  });
  it("keeps missing pay unknown and only compares stated hourly pay", () => {
    const settings = { ...initialStore().settings, minHourly: "30" };
    expect(preferenceReasons(job, settings)).toEqual(["salary"]);
    expect(preferenceReasons({ ...job, salary: "" }, settings)).toEqual([]);
    expect(
      preferenceReasons({ ...job, salary: "$60,000 annually" }, settings),
    ).toEqual([]);
  });
  it("retains manually completed text when a feed returns a new snippet", () => {
    const applications = {
      [job.id]: {
        job,
        stage: "saved" as const,
        note: "Call tomorrow",
        updatedAt: job.checkedAt,
      },
    };
    const merged = combineJobs(
      [{ ...job, description: "short", completeness: "snippet" }],
      [],
      applications,
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].description).toBe(job.description);
    expect(combineJobs([], [], applications)).toHaveLength(1);
  });
  it("prevents final preparation from snippets and preserves original CV facts", () => {
    const profile = {
      ...initialStore().profile,
      cv: "Example Candidate\nWorked at Example Co, 2023–2025.",
      name: "Example Candidate",
    };
    expect(() =>
      createPacket({ ...job, completeness: "snippet" }, profile, "fr"),
    ).toThrow();
    expect(() =>
      createPacket({ ...job, availability: "closed" }, profile, "fr"),
    ).toThrow();
    const packet = createPacket(job, profile, "fr");
    expect(packet.cv).toBe(profile.cv);
    expect(packet.approvedAt).toBeNull();
    expect(packet.letter).toContain(job.employer);
  });
});
describe("imports and unsafe data", () => {
  it("roundtrips a backup but rejects malformed structures and unsafe URLs", () => {
    const store = initialStore();
    store.jobs = [job];
    expect(parseBackup(JSON.stringify(store))).toEqual(store);
    expect(() =>
      parseBackup(
        JSON.stringify({
          ...store,
          jobs: [{ ...job, url: "javascript:alert(1)" }],
        }),
      ),
    ).toThrow();
    expect(() =>
      parseBackup(
        JSON.stringify({ ...store, jobs: [{ ...job, id: "__proto__" }] }),
      ),
    ).toThrow();
    expect(() =>
      parseBackup(JSON.stringify({ ...store, schemaVersion: 999 })),
    ).toThrow();
    expect(safeUrl("https://user:password@example.com")).toBe("");
  });
  it("parses Atom HTML summaries as inert text and keeps snippets incomplete", () => {
    const atom =
      '<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Assistant</title><link href="https://example.org/job/1"/><summary type="html">Employer: Example&lt;br/&gt;Location: Laval&lt;br/&gt;Salary: $25 hourly</summary></entry></feed>';
    const jobs = parseAtom(atom);
    expect(jobs[0].employer).toBe("Example");
    expect(jobs[0].location).toBe("Laval");
    expect(jobs[0].completeness).toBe("snippet");
    expect(jobs[0].publishedAt).toBeNull();
    expect(parseAtom(atom)[0].id).toBe(jobs[0].id);
    expect(() => parseAtom("<!DOCTYPE feed><feed/>")).toThrow();
  });
});
describe("cross-device revision decisions", () => {
  it("pulls remote changes when there are no local edits", () =>
    expect(syncDecision(false, 2, 3)).toBe("pull"));
  it("pushes only against the revision the local edits started from", () =>
    expect(syncDecision(true, 2, 2)).toBe("push"));
  it("detects conflicting offline edits instead of silently overwriting them", () =>
    expect(syncDecision(true, 2, 3)).toBe("conflict"));
  it("initializes a new remote workspace without pretending another revision exists", () =>
    expect(syncDecision(true, 0, 0)).toBe("push"));
});
