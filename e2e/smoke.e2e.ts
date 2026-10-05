import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

// Against a deployed site the real public feed is used; locally a synthetic one keeps the run offline.
const deployed = !!process.env.SMOKE_BASE_URL;
const feed = readFileSync(
  new URL("./fixtures/jobs.json", import.meta.url),
  "utf8",
);
const titles = {
  uk: "Знайдіть свій наступний крок",
  en: "Find your next step",
  fr: "Trouvez votre prochaine étape",
  de: "Finden Sie Ihren nächsten Schritt",
} as const;

async function open(page: Page) {
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (!deployed && message.type() === "error")
      problems.push(`console: ${message.text()}`);
  });
  if (!deployed)
    await page.route("**/jobs.json", (route) =>
      route.fulfill({ contentType: "application/json", body: feed }),
    );
  await page.goto("./");
  await expect(page.locator("h1")).toBeVisible();
  return problems;
}

async function openView(page: Page, index: number) {
  const menu = page.locator(".mobile-menu");
  if (await menu.isVisible()) await menu.click();
  await page.locator(".sidebar nav .nav-item").nth(index).click();
}

test.describe("first visit", () => {
  test.use({ locale: "de-DE" });

  test("detects the browser language, then switches and remembers it", async ({
    page,
  }) => {
    const problems = await open(page);
    await expect(page.locator("h1")).toHaveText(titles.de);
    await expect(page.locator("html")).toHaveAttribute("lang", "de");

    const select = page.locator(".language-select select");
    for (const language of ["uk", "en", "fr", "de"] as const) {
      await select.selectOption(language);
      await expect(page.locator("h1")).toHaveText(titles[language]);
      await expect(page.locator("html")).toHaveAttribute("lang", language);
    }
    await select.selectOption("fr");
    await page.reload();
    await expect(page.locator("h1")).toHaveText(titles.fr);
    await expect(page).toHaveTitle("JobSearch — votre prochaine étape");
    expect(problems).toEqual([]);
  });
});

test.describe("core flows", () => {
  test.use({ locale: "en-CA" });

  test("renders every view without errors", async ({ page }) => {
    const problems = await open(page);
    if (!deployed) await expect(page.locator(".job-card")).toHaveCount(3);
    const headings = [
      titles.en,
      "Saved",
      "My applications",
      "My profile",
      "Documents",
      "Sources",
    ];
    for (const [index, heading] of headings.entries()) {
      await openView(page, index);
      await expect(page.locator("h1")).toHaveText(heading);
    }
    // No horizontal scrolling on either viewport.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    expect(problems).toEqual([]);
  });

  test("keeps a manually added job and offers German documents", async ({
    page,
  }) => {
    const problems = await open(page);
    await page.locator(".add-top").click();
    const form = page.locator("dialog form");
    await form.getByLabel("Job title *").fill("Smoke test coordinator");
    await form.getByLabel("Employer *").fill("Synthetic Employer");
    await form
      .getByLabel("Job description")
      .fill("Coordinate schedules and prepare reports.");
    await form.getByRole("checkbox").check();
    await form.getByRole("button", { name: "Add a job" }).click();
    const card = page
      .locator(".job-card")
      .filter({ hasText: "Smoke test coordinator" });
    await expect(card).toHaveCount(1);
    await expect(card).toContainText("Added manually");

    await page.reload();
    await expect(card).toHaveCount(1);

    await page.locator(".hero-button").click();
    const documentLanguage = page
      .locator("dialog")
      .getByLabel("Language of new documents");
    await expect(documentLanguage.locator("option")).toHaveText([
      "Français",
      "English",
      "Deutsch",
      "Українська",
    ]);
    await documentLanguage.selectOption("de");
    await page.locator("dialog").getByRole("button", { name: "Save" }).click();
    await page.reload();
    await page.locator(".hero-button").click();
    await expect(
      page.locator("dialog").getByLabel("Language of new documents"),
    ).toHaveValue("de");
    expect(problems).toEqual([]);
  });

  test("stops an import and a new job at the job limit and keeps the workspace readable", async ({
    page,
  }) => {
    // A guest workspace one job short of the 2000-job limit, for the production and stage keys.
    await page.addInitScript(() => {
      const key = "jobsearch.workspace.v1:guest";
      if (localStorage.getItem(key)) return;
      const jobs = Array.from({ length: 1999 }, (_, index) => ({
        id: `synthetic:${index}`,
        title: `Synthetic job ${index}`,
        employer: "Example Co",
        location: "",
        salary: "",
        url: "",
        source: "Job Bank",
        description: "",
        completeness: "snippet",
        publishedAt: null,
        firstSeenAt: "2026-10-01T12:00:00.000Z",
        checkedAt: "2026-10-01T12:00:00.000Z",
        availability: "unknown",
      }));
      const cache = JSON.stringify({
        store: {
          schemaVersion: 1,
          profile: {
            name: "",
            email: "",
            phone: "",
            headline: "",
            summary: "",
            skills: "",
            cv: "",
            version: 1,
          },
          settings: {
            city: "",
            roles: "",
            minHourly: "",
            documentLanguage: "fr",
            applyPreferences: false,
          },
          jobs,
          applications: {},
          packets: [],
        },
        revision: 0,
        dirty: false,
      });
      localStorage.setItem(key, cache);
      localStorage.setItem("jobsearch.stage.workspace.v1:guest", cache);
      localStorage.setItem("jobsearch.language", "en");
    });
    const problems = await open(page);
    await openView(page, 5);
    const items = [1, 2, 3].map(
      (n) =>
        `<item><title>Imported synthetic job ${n}</title><link>https://example.org/jobs/${n}</link></item>`,
    );
    await page.locator('input[type="file"][accept*=".rss"]').setInputFiles({
      name: "synthetic-feed.xml",
      mimeType: "application/rss+xml",
      buffer: Buffer.from(
        `<rss version="2.0"><channel>${items.join("")}</channel></rss>`,
      ),
    });
    await expect(page.locator(".toast")).toContainText(
      "Jobs imported: 1. Skipped: 2",
    );

    await page.reload();
    await expect(page.locator("h1")).toHaveText(titles.en);
    await expect(page.locator('.notice[role="alert"]')).toHaveCount(0);

    // A full workspace refuses one more job, says why inside the dialog and keeps the form.
    await page.locator(".add-top").click();
    const form = page.locator("dialog form");
    await form.getByLabel("Job title *").fill("One job too many");
    await form.getByLabel("Employer *").fill("Synthetic Employer");
    await form.getByRole("button", { name: "Add a job" }).click();
    await expect(page.locator("dialog .modal-alert")).toHaveText(
      "The change was not saved. Too many jobs: your space holds up to 2000.",
    );
    await expect(form.getByLabel("Job title *")).toHaveValue("One job too many");
    // Only the key this build uses grew, exactly to the limit, and no recovery copy was needed.
    const stored = await page.evaluate(() =>
      Object.keys(localStorage)
        .filter((name) => name.includes(":guest"))
        .map((name) =>
          name.endsWith(":guest")
            ? JSON.parse(localStorage.getItem(name)!).store.jobs.length
            : name,
        ),
    );
    expect(stored.sort()).toEqual([1999, 2000]);
    expect(problems).toEqual([]);
  });
});
