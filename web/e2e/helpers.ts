import { expect, type Page } from "@playwright/test";

export const PASSWORD = "Passw0rd!x";
export const accounts = {
  reader: "e2e-reader@example.com",
  writer: "e2e-writer@example.com",
  editor: "e2e-editor@example.com",
  admin: "e2e-admin@example.com",
} as const;

/** A short number that makes a title or a comment different on every run. */
export const unique = () => String(Math.floor(Math.random() * 90_000) + 10_000);

/** Signs in through the site's own sign-in screen and waits until the header says so. */
export async function signIn(page: Page, email: string): Promise<void> {
  await page.goto("/auth");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.locator("form").getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("button", { name: "Sign out" }).first()).toBeVisible();
}

/** Signs in to the back office, whose gate has its own form. */
export async function signInToAdmin(page: Page, email: string, path = "/admin"): Promise<void> {
  await page.goto(path);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("navigation", { name: "Back office navigation" })).toBeVisible();
}
