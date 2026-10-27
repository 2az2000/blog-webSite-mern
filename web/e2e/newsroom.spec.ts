import { expect, test } from "@playwright/test";

import { accounts, signIn, signInToAdmin, unique } from "./helpers";

test.describe("the newsroom", () => {
  test("an editor writes a story, publishes it, and readers can read it", async ({ page, request }) => {
    const title = `E2E publishing ${unique()}`;
    await signInToAdmin(page, accounts.editor);

    await page.getByRole("link", { name: "New article" }).first().click();
    // wait for the create screen: on the list the search box is also a "title" field
    const create = page.locator("form").filter({ has: page.getByRole("button", { name: "Create draft" }) });
    await expect(create).toBeVisible();
    await create.getByLabel("Title").fill(title);
    await create.getByLabel("Section").selectOption("technology");
    await create.getByLabel("Author").selectOption("duarte");
    await create.getByRole("button", { name: "Create draft" }).click();

    // an unfinished story cannot go live, and says what is missing
    await expect(page.getByRole("heading", { level: 1 })).toContainText(title);
    await page.getByRole("button", { name: "Publish now" }).click();
    await expect(page.getByText("not ready to go live")).toBeVisible();

    await page.getByLabel("Standfirst").fill("A standfirst long enough to stand for the whole story in a link preview.");
    await page.getByLabel("Lead image", { exact: true }).fill("/images/context-software.jpg");
    await page.getByRole("tab", { name: "Body" }).click();
    await page.getByRole("button", { name: "Add a block" }).click();
    await page.getByRole("tabpanel").getByLabel("Text", { exact: true }).first().fill("The **first** paragraph of a story written by the browser tests.");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Version 2")).toBeVisible();

    await page.getByRole("button", { name: "Publish now" }).click();
    await expect(page.getByText("Published", { exact: true }).first()).toBeVisible();

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const live = await request.get(`/api/v1/articles/${slug}`);
    expect(live.status()).toBe(200);
    await page.goto(`/article/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(title);
    await expect(page.getByText("first paragraph of a story written by the browser tests")).toBeVisible();
  });

  test("a writer sees only their own work and has no way to publish", async ({ page }) => {
    await signInToAdmin(page, accounts.writer);
    await expect(page.getByRole("link", { name: "Comments" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Accounts" })).toHaveCount(0);
    await page.goto("/admin/comments");
    await expect(page.getByText("could not be loaded")).toBeVisible();
  });

  test("a held comment waits for a moderator, then appears for everyone", async ({ browser }) => {
    const text = `t${unique()}`; // under ten characters: held for a person to read
    const reader = await browser.newContext();
    const readerPage = await reader.newPage();
    await signIn(readerPage, accounts.reader);
    await readerPage.goto("/article/interfaces-standing-still");
    await readerPage.getByLabel("Your comment").fill(text);
    await readerPage.getByRole("button", { name: "Post comment" }).click();
    await expect(readerPage.getByText(text)).toBeVisible();
    await expect(readerPage.getByText("Awaiting review")).toBeVisible();

    // a visitor does not see it
    const visitor = await browser.newContext();
    const visitorPage = await visitor.newPage();
    await visitorPage.goto("/article/interfaces-standing-still");
    await expect(visitorPage.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(visitorPage.getByText(text)).toHaveCount(0);

    // the editor reads it and approves it
    const staff = await browser.newContext();
    const staffPage = await staff.newPage();
    await signInToAdmin(staffPage, accounts.editor, "/admin/comments");
    const card = staffPage.getByRole("listitem").filter({ hasText: text });
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: "Approve" }).click();
    await expect(card).toHaveCount(0);

    await visitorPage.reload();
    await expect(visitorPage.getByText(text)).toBeVisible();
    await Promise.all([reader.close(), visitor.close(), staff.close()]);
  });

  test("the front page follows the editors: pinning a story puts it in the lead", async ({ page, request }) => {
    await signInToAdmin(page, accounts.editor, "/admin/front-page");
    const lead = page.getByRole("combobox", { name: "The lead story 1" });
    const original = await lead.inputValue();
    await lead.selectOption("quiet-office");
    await page.getByRole("button", { name: "Save front page" }).click();
    await expect(page.getByText("Front page saved")).toBeVisible();

    const home = await (await request.get("/api/v1/placements/home")).json();
    expect(home.data.lead[0].slug).toBe("quiet-office");

    // leave the front page as it was found
    await lead.selectOption(original);
    await page.getByRole("button", { name: "Save front page" }).click();
    await expect(page.getByText("Front page saved").first()).toBeVisible();
  });
});
