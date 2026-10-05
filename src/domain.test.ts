// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  assertStorable,
  combineJobs,
  createPacket,
  initialStore,
  matchingTerms,
  MAX_BACKUP_FILE_BYTES,
  mergeImportedJobs,
  parseAtom,
  parseBackup,
  preferenceReasons,
  safeUrl,
  serializeBackup,
  storedBytes,
  validateStore,
  WORKSPACE_LIMITS,
} from "./domain";
import { syncDecision } from "./cloud";
import { t } from "./i18n";
import type { Job, Packet } from "./types";

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
    const { jobs, skipped } = parseAtom(atom);
    expect(skipped).toBe(0);
    expect(jobs[0].employer).toBe("Example");
    expect(jobs[0].location).toBe("Laval");
    expect(jobs[0].completeness).toBe("snippet");
    expect(jobs[0].publishedAt).toBeNull();
    expect(parseAtom(atom).jobs[0].id).toBe(jobs[0].id);
    expect(() => parseAtom("<!DOCTYPE feed><feed/>")).toThrow();
  });
});
describe("workspace limits", () => {
  const jobs = (count: number, prefix = "synthetic") =>
    Array.from({ length: count }, (_, i) => ({ ...job, id: `${prefix}:${i}` }));
  const packet = (id: number, text = "Synthetic text."): Packet => ({
    id: `packet-${id}`,
    jobId: job.id,
    title: job.title,
    employer: job.employer,
    cv: text,
    letter: text,
    profileVersion: 1,
    descriptionVersion: "1",
    createdAt: job.checkedAt,
    approvedAt: null,
  });
  const entry = (title: string, n: number) =>
    `<entry><title>${title}</title><link href="https://example.org/job/${n}"/></entry>`;
  const atom = (entries: string[]) =>
    `<feed xmlns="http://www.w3.org/2005/Atom">${entries.join("")}</feed>`;

  it("accepts a workspace at the limits and names the limit that is exceeded", () => {
    const store = initialStore();
    store.jobs = jobs(WORKSPACE_LIMITS.jobs);
    store.packets = Array.from({ length: WORKSPACE_LIMITS.packets }, (_, i) =>
      packet(i),
    );
    expect(validateStore(store)).toEqual(store);
    expect(() =>
      validateStore({ ...store, jobs: [...store.jobs, job] }),
    ).toThrow(t("workspace.limit.jobs", { max: 2000 }));
    expect(() =>
      validateStore({ ...store, packets: [...store.packets, packet(500)] }),
    ).toThrow(t("workspace.limit.packets", { max: 500 }));
    const applications = Object.fromEntries(
      jobs(WORKSPACE_LIMITS.applications + 1).map((saved) => [
        saved.id,
        { job: saved, stage: "saved", note: "", updatedAt: saved.checkedAt },
      ]),
    );
    expect(() => validateStore({ ...store, applications })).toThrow(
      t("workspace.limit.applications", { max: 2000 }),
    );
    expect(() =>
      validateStore({ ...store, jobs: [{ ...job, title: "x".repeat(1001) }] }),
    ).toThrow(t("error.textField"));
  });
  it("measures a value the way the cloud stores it, without serializing it", () => {
    expect(storedBytes({ a: 1, b: [true, null, "x"], c: {}, d: [] })).toBe(
      '{"a": 1, "b": [true, null, "x"], "c": {}, "d": []}'.length,
    );
    expect(storedBytes({ kept: "x", dropped: undefined })).toBe(
      '{"kept": "x"}'.length,
    );
    const text = 'Zoë "quoted" \\ \n\t\u0001 Київ € \u{1F600} \ud83d';
    expect(storedBytes(text)).toBe(new Blob([JSON.stringify(text)]).size);
  });
  it("rejects growth past the size limit but lets an oversized workspace shrink", () => {
    const store = initialStore();
    const oversized = {
      ...store,
      packets: Array.from({ length: 15 }, (_, i) =>
        packet(i, "x".repeat(200000)),
      ),
    };
    expect(storedBytes(oversized)).toBeGreaterThan(WORKSPACE_LIMITS.bytes);
    expect(() => assertStorable(oversized, store)).toThrow(
      t("workspace.limit.size"),
    );
    expect(() => assertStorable(oversized, oversized)).toThrow(
      t("workspace.limit.size"),
    );
    const smaller = { ...oversized, packets: oversized.packets.slice(1) };
    expect(storedBytes(smaller)).toBeGreaterThan(WORKSPACE_LIMITS.bytes);
    expect(() => assertStorable(smaller, oversized)).not.toThrow();
  });
  it("rejects a backup that fits 5 MB as a file but not as the cloud stores it", () => {
    const store = initialStore();
    store.jobs = jobs(WORKSPACE_LIMITS.jobs);
    // Pad the compact file to exactly the limit; stored JSON adds a space after each separator.
    let missing = WORKSPACE_LIMITS.bytes - new Blob([JSON.stringify(store)]).size;
    for (const item of store.jobs) {
      const extra = Math.min(missing, 200000 - item.description.length);
      item.description += "x".repeat(extra);
      missing -= extra;
    }
    const text = JSON.stringify(store);
    expect(new Blob([text]).size).toBe(WORKSPACE_LIMITS.bytes);
    expect(() => parseBackup(text)).toThrow(t("workspace.limit.size"));
  });
  it("restores the downloaded backup of a workspace that is as large as the app accepts", () => {
    // Every list at its item limit and every optional field present: the shape whose
    // indented file exceeds the stored size the most.
    const store = initialStore();
    store.jobs = jobs(WORKSPACE_LIMITS.jobs);
    store.applications = Object.fromEntries(
      jobs(WORKSPACE_LIMITS.applications, "applied").map((saved) => [
        saved.id,
        {
          job: saved,
          stage: "submitted" as const,
          note: "",
          updatedAt: saved.checkedAt,
          submittedAt: saved.checkedAt,
          evidence: "user_reported" as const,
        },
      ]),
    );
    store.packets = Array.from({ length: WORKSPACE_LIMITS.packets }, (_, i) => ({
      ...packet(i),
      frozenAt: job.checkedAt,
      llmRunId: "synthetic-run",
      llmRulesVersion: "1",
    }));
    // Fill the descriptions until the workspace is exactly at the size limit.
    let missing = WORKSPACE_LIMITS.bytes - storedBytes(store);
    for (const item of store.jobs) {
      const extra = Math.min(missing, 200000 - item.description.length);
      item.description += "x".repeat(extra);
      missing -= extra;
    }
    expect(storedBytes(store)).toBe(WORKSPACE_LIMITS.bytes);
    const file = serializeBackup(store);
    const size = new Blob([file]).size;
    expect(size).toBeGreaterThan(WORKSPACE_LIMITS.bytes);
    expect(size).toBeLessThanOrEqual(MAX_BACKUP_FILE_BYTES);
    expect(parseBackup(file)).toEqual(store);
  });
  it("does not parse a backup file above the file bound", () => {
    const store = initialStore();
    const json = serializeBackup(store);
    // Leading whitespace is valid JSON, so only the bound can reject the larger file.
    const padded = (bytes: number) =>
      " ".repeat(bytes - new Blob([json]).size) + json;
    expect(parseBackup(padded(MAX_BACKUP_FILE_BYTES))).toEqual(store);
    expect(() => parseBackup(padded(MAX_BACKUP_FILE_BYTES + 1))).toThrow(
      t("error.fileTooLarge"),
    );
    const megabytes = `${MAX_BACKUP_FILE_BYTES / 1024 / 1024} МБ`;
    expect(t("error.fileTooLarge")).toContain(megabytes);
    expect(t("data.restore.detail")).toContain(megabytes);
  });
  it("caps an import at the job limit and counts what was left out", () => {
    const current = jobs(WORKSPACE_LIMITS.jobs - 2, "kept");
    const snippet = { description: "short", completeness: "snippet" as const };
    const incoming = [
      { ...job, ...snippet, id: "kept:0", title: "Refreshed" },
      ...jobs(5, "new"),
      { ...job, id: "new:0", title: "Repeated in the file" },
    ];
    const merged = mergeImportedJobs(current, incoming);
    expect(merged.jobs).toHaveLength(WORKSPACE_LIMITS.jobs);
    expect(merged.imported).toBe(3);
    expect(merged.skipped).toBe(3);
    // The refreshed snippet keeps the full description saved earlier.
    expect(merged.jobs[0]).toMatchObject({
      title: "Refreshed",
      description: job.description,
      completeness: "full",
    });
    expect(merged.jobs.map((item) => item.id).slice(-2)).toEqual([
      "new:0",
      "new:1",
    ]);
    expect(() =>
      validateStore({ ...initialStore(), jobs: merged.jobs }),
    ).not.toThrow();
    // A full workspace still refreshes the jobs it already has.
    const full = mergeImportedJobs(merged.jobs, incoming);
    expect(full).toMatchObject({ imported: 3, skipped: 3 });
    expect(full.jobs).toHaveLength(WORKSPACE_LIMITS.jobs);
  });
  it("leaves out feed entries that a workspace cannot hold", () => {
    const oversized = parseAtom(
      atom([entry("Fits", 1), entry("x".repeat(1001), 2)]),
    );
    expect(oversized.skipped).toBe(1);
    expect(oversized.jobs.map((item) => item.title)).toEqual(["Fits"]);
    const long = parseAtom(
      atom(
        Array.from({ length: WORKSPACE_LIMITS.jobs + 3 }, (_, i) =>
          entry("Job", i),
        ),
      ),
    );
    expect(long.jobs).toHaveLength(WORKSPACE_LIMITS.jobs);
    expect(long.skipped).toBe(3);
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
