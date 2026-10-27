import { expect, test } from "@playwright/test";

import { accounts, signInToAdmin, unique } from "./helpers";

test.describe("the legal pages", () => {
  test("the footer reaches the privacy notice, the terms and the cookie policy", async ({ page }) => {
    await page.goto("/");
    const legal = page.getByRole("navigation", { name: "Legal" });
    await legal.getByRole("link", { name: "Privacy" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Privacy notice" })).toBeVisible();
    await expect(page.getByText(/Last updated/)).toBeVisible();

    await page.getByRole("navigation", { name: "Legal" }).getByRole("link", { name: "Terms" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Terms of use" })).toBeVisible();

    await page.getByRole("navigation", { name: "Legal" }).getByRole("link", { name: "Cookies" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Cookie policy" })).toBeVisible();
  });

  test("the contents list jumps to a section, and says what the site really stores", async ({ page }) => {
    await page.goto("/cookies");
    // every cookie the API sets is in the table
    const table = page.getByRole("table", { name: "Everything NOVA stores on your device" });
    await expect(table.getByRole("rowheader", { name: "nova_at" })).toBeVisible();
    await expect(table.getByRole("rowheader", { name: "nova_rt" })).toBeVisible();
    await page.getByRole("navigation", { name: "On this page" }).getByRole("link", { name: /Your choice/ }).click();
    await expect(page).toHaveURL(/#choose$/);
  });

  test("the sign-up form links to the terms and the privacy notice", async ({ page }) => {
    await page.goto("/auth#signup");
    await expect(page.getByRole("link", { name: "terms", exact: true })).toHaveAttribute("href", "/terms");
    await expect(page.getByRole("link", { name: "privacy notice" }).first()).toHaveAttribute("href", "/privacy");
  });

  test("the legal pages are public: indexed, in the sitemap", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    for (const path of ["/privacy", "/terms", "/cookies"]) expect(sitemap).toContain(path);
    const robots = await (await request.get("/robots.txt")).text();
    for (const path of ["/privacy", "/terms", "/cookies"]) expect(robots).not.toContain(`Disallow: ${path}`);
  });
});

test.describe("the cookie notice", () => {
  // a first-time visitor: nothing answered yet
  test.use({ storageState: { cookies: [], origins: [] } });

  const stored = (page: import("@playwright/test").Page, key: string) => page.evaluate((k) => localStorage.getItem(k), key);

  test("asks once, with two equal answers, and remembers the answer", async ({ page }) => {
    await page.goto("/");
    const notice = page.getByRole("region", { name: "Cookie notice" });
    await expect(notice).toBeVisible();
    await expect(notice.getByRole("button", { name: "Allow preferences" })).toBeVisible();
    await expect(notice.getByRole("button", { name: "Essential only" })).toBeVisible();

    await notice.getByRole("button", { name: "Essential only" }).click();
    await expect(notice).toBeHidden();
    const saved = JSON.parse((await stored(page, "nova:consent"))!) as { preferences: boolean; policy: string };
    expect(saved.preferences).toBe(false);
    expect(saved.policy).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    await page.reload();
    await expect(page.getByRole("region", { name: "Cookie notice" })).toBeHidden();
  });

  test("remembers the theme only if preferences were allowed, and forgets it when they are taken back", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("region", { name: "Cookie notice" }).getByRole("button", { name: "Allow preferences" }).click();
    await page.getByRole("button", { name: "Switch to dark theme" }).first().click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await stored(page, "nova:theme")).toBe("dark");

    // changing your mind erases what was stored
    await page.getByRole("button", { name: "Cookie settings" }).click();
    await page.getByRole("region", { name: "Cookie notice" }).getByRole("button", { name: "Essential only" }).click();
    expect(await stored(page, "nova:theme")).toBeNull();

    // and with essential only, a new choice is not stored
    await page.getByRole("button", { name: "Switch to light theme" }).first().click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(await stored(page, "nova:theme")).toBeNull();
  });

  test("can be changed from the cookie policy page", async ({ page }) => {
    await page.goto("/cookies");
    await page.getByRole("region", { name: "Cookie notice" }).getByRole("button", { name: "Allow preferences" }).click();
    const panel = page.getByRole("status").filter({ hasText: "Preferences are allowed" });
    await expect(panel).toBeVisible();
    await page.getByRole("button", { name: "Essential only" }).click();
    await expect(page.getByText("Essential only: nothing optional is stored.")).toBeVisible();
  });
});

test.describe("pictures need a description", () => {
  test("the editor will not take an upload until the picture is described or marked decorative", async ({ page }) => {
    const title = `E2E alt ${unique()}`;
    await signInToAdmin(page, accounts.editor);
    await page.getByRole("link", { name: "New article" }).first().click();
    const create = page.locator("form").filter({ has: page.getByRole("button", { name: "Create draft" }) });
    await create.getByLabel("Title").fill(title);
    await create.getByLabel("Section").selectOption("technology");
    await create.getByLabel("Author").selectOption("duarte");
    await create.getByRole("button", { name: "Create draft" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(title);

    await page.getByRole("tab", { name: "Body" }).click();
    await page.getByLabel("Add a block").selectOption("figure");
    await page.getByRole("button", { name: "Add a block" }).click();

    const panel = page.getByRole("tabpanel");
    const upload = panel.locator('input[type="file"]');
    await expect(panel.getByText(/Describe the picture first/)).toBeVisible();
    await expect(upload).toBeDisabled();

    await panel.getByLabel("Alt text (describe the picture)").fill("A rack of servers in a dim hall");
    await expect(upload).toBeEnabled();
    await panel.getByLabel("Alt text (describe the picture)").fill("");
    await expect(upload).toBeDisabled();
    await panel.getByLabel("Decorative: needs no description").check();
    await expect(upload).toBeEnabled();
  });
});
