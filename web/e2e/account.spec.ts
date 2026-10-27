import { expect, test } from "@playwright/test";

import { accounts, signIn, unique } from "./helpers";

test.describe("a reader with an account", () => {
  test("signs in, comments, likes and saves a story, and signs out", async ({ page }) => {
    await signIn(page, accounts.reader);

    await page.goto("/article/human-brain");
    const comment = `A considered reply from the browser tests, number ${unique()}.`;
    await page.getByLabel("Your comment").fill(comment);
    await page.getByRole("button", { name: "Post comment" }).click();
    await expect(page.getByText(comment)).toBeVisible();

    // earlier runs may have left the heart or the bookmark on: the test cares that they end up on, and stay on
    const like = page.getByRole("button", { name: /^(Like|Remove your like): / });
    if ((await like.getAttribute("aria-pressed")) !== "true") await like.click();
    await expect(like).toHaveAttribute("aria-pressed", "true");

    const save = page.getByRole("button", { name: /^(Save for later|Remove from saved): / }).first();
    if ((await save.getAttribute("aria-pressed")) !== "true") await save.click();
    await expect(save).toHaveAttribute("aria-pressed", "true");

    await page.goto("/bookmarks");
    await expect(page.getByText(/Quiet Revolution/).first()).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).first().click();
    await expect(page.getByRole("link", { name: "Sign in" }).first()).toBeVisible();
  });

  test("is refused a wrong password, with the same message as an unknown address", async ({ page }) => {
    for (const email of [accounts.reader, "nobody-here@example.com"]) {
      await page.goto("/auth");
      await page.getByLabel("Email address").fill(email);
      await page.getByLabel("Password").fill("not-the-password");
      await page.locator("form").getByRole("button", { name: "Sign in" }).click();
      await expect(page.getByText("That email and password do not match.")).toBeVisible();
    }
  });

  test("a visitor who is not signed in is sent to sign in, not allowed to follow", async ({ page }) => {
    await page.goto("/author/duarte");
    await page.getByRole("button", { name: "Follow", exact: true }).click();
    await expect(page).toHaveURL(/\/auth\?next=/);
  });
});

test.describe("the newsletter", () => {
  test("a sign-up asks for confirmation instead of subscribing at once", async ({ page }) => {
    await page.goto("/newsletter");
    await page.getByRole("button", { name: "Design", exact: true }).click();
    await page.locator("#hero-email").fill(`reader-${unique()}@example.com`);
    await page.getByRole("button", { name: "Subscribe free" }).click();
    await expect(page.getByText("One more step")).toBeVisible();
  });

  test("a link that is not from a real e-mail is rejected with a way back", async ({ page }) => {
    await page.goto("/newsletter/manage?token=not.a-real-token");
    await expect(page.getByText(/not valid/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to the Dispatch" })).toBeVisible();
    await page.goto("/newsletter/confirm?token=nothing");
    await expect(page.getByText(/not valid, or has already been used/)).toBeVisible();
  });
});
