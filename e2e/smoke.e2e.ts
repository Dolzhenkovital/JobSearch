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
});
