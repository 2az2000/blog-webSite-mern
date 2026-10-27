import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

import { accounts, signIn, signInToAdmin, unique } from "./helpers";

test.describe("account settings", () => {
  test("a visitor who is not signed in is asked to sign in", async ({ page }) => {
    await page.goto("/account");
    await expect(page.getByRole("heading", { name: "Sign in to manage your account" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" }).first()).toBeVisible();
  });

  test("a reader renames themselves, manages the Dispatch, sees their devices and downloads their data", async ({ page }) => {
    await signIn(page, accounts.reader);
    await page.getByRole("link", { name: "Account", exact: true }).first().click();
    await expect(page.getByRole("heading", { level: 1, name: "Account settings" })).toBeVisible();

    // profile
    const profile = page.getByRole("region", { name: "Profile" });
    const name = `Reader ${unique()}`;
    await profile.getByLabel("Name").fill(name);
    await profile.getByRole("button", { name: "Save name" }).click();
    await expect(page.getByText("Your name was updated.")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("region", { name: "Profile" }).getByLabel("Name")).toHaveValue(name);

    // the Dispatch, from the account: no e-mail round trip
    const dispatch = page.getByRole("region", { name: "The Dispatch" });
    await expect(dispatch.getByRole("button", { name: /^(Subscribe|Save preferences)$/ })).toBeVisible();
    await dispatch.getByRole("button", { name: "Design", exact: true }).click();
    await dispatch.getByRole("radio", { name: /Friday only/ }).check();
    await dispatch.getByRole("button", { name: /^(Subscribe|Save preferences)$/ }).click();
    await expect(dispatch.getByRole("button", { name: "Save preferences" })).toBeVisible();
    await expect(dispatch.getByText("Subscribed", { exact: true })).toBeVisible();
    await page.reload();
    const again = page.getByRole("region", { name: "The Dispatch" });
    await expect(again.getByRole("radio", { name: /Friday only/ })).toBeChecked();
    await again.getByRole("button", { name: "Unsubscribe" }).click();
    await expect(again.getByText("Unsubscribed", { exact: true })).toBeVisible();

    // devices: this one is marked, and cannot be signed out from its own row
    const devices = page.getByRole("region", { name: "Devices" });
    await expect(devices.getByText("This device")).toBeVisible();

    // wrong current password is named, not a generic failure
    const password = page.getByRole("region", { name: "Password" });
    await password.getByLabel("Current password").fill("not-the-password-1");
    await password.getByLabel("New password").fill("Another-Passw0rd");
    await password.getByRole("button", { name: "Change password" }).click();
    await expect(password.getByText("The current password is not right.")).toBeVisible();

    // the right to the record
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download my data" }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe("nova-my-data.json");
    const saved = JSON.parse(await readFile(await file.path(), "utf8")) as { account: { email: string } };
    expect(saved.account.email).toBe(accounts.reader);
    expect(JSON.stringify(saved)).not.toMatch(/passwordHash|tokenHash/);

    // deleting asks for the password first
    await page.getByRole("button", { name: "Delete my account" }).click();
    await page.getByRole("dialog").getByLabel("Password").fill("definitely-wrong-1");
    await page.getByRole("dialog").getByRole("button", { name: "Delete everything" }).click();
    await expect(page.getByRole("dialog").getByText("That password is not right.")).toBeVisible();
  });
});

test.describe("the overview and the roles table", () => {
  test("an editor sees the whole newsroom: traffic, most read, and what waits for a person", async ({ page }) => {
    await signInToAdmin(page, accounts.editor);
    await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
    await expect(page.getByText("The whole newsroom")).toBeVisible();
    await expect(page.getByText("Completed reads", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Views per day" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Waiting for a person" })).toBeVisible();
    await page.getByRole("button", { name: "Last 7 days" }).click();
    await expect(page.getByRole("button", { name: "Last 7 days" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("link", { name: "Accounts" })).toHaveCount(0);

    await page.getByRole("link", { name: "Reports" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Broken-link reports" })).toBeVisible();
  });

  test("a writer's overview is about their own stories only", async ({ page }) => {
    await signInToAdmin(page, accounts.writer);
    await expect(page.getByText("Your stories", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Waiting for a person" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Reports" })).toHaveCount(0);
  });

  test("an admin reads the permission table the server enforces", async ({ page }) => {
    await signInToAdmin(page, accounts.admin);
    await page.getByRole("link", { name: "Roles", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Roles and permissions" })).toBeVisible();
    const row = page.getByRole("row", { name: /Change roles and suspend accounts/ });
    await expect(row).toBeVisible();
    // only the admin may change roles
    await expect(row.getByText("Allowed", { exact: true })).toHaveCount(1);
    await expect(row.getByText("Not allowed", { exact: true })).toHaveCount(3);
  });
});
