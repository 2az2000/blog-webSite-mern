import { describe, expect, it } from "vitest";
import {
  frequenciesFor,
  issueFitsTopics,
  manageToken,
  readManageToken,
  topicsOfIssue,
} from "../../src/modules/newsletter/newsletter-rules.js";
import { issueMail } from "../../src/services/email/newsletter-mail.js";
import { subscribeSchema, updatePreferencesSchema, issueInputSchema } from "../../src/modules/newsletter/newsletter.schemas.js";

describe("who an issue is for", () => {
  it("sends Tuesday to 'both', Friday to 'both' and 'weekly', the monthly digest to 'monthly'", () => {
    expect(frequenciesFor("tuesday")).toEqual(["both"]);
    expect(frequenciesFor("friday").sort()).toEqual(["both", "weekly"]);
    expect(frequenciesFor("monthly")).toEqual(["monthly"]);
  });

  it("collects the desks an issue touches, and 'longreads' for a long read", () => {
    const topics = topicsOfIssue([
      { section: "technology", kind: "article" },
      { section: "society", kind: "longread" },
    ]);
    expect([...topics].sort()).toEqual(["longreads", "society", "technology"]);
  });

  it("gives a subscriber with no topics everything, and the rest only what touches theirs", () => {
    const topics = new Set(["technology", "design"]);
    expect(issueFitsTopics([], topics)).toBe(true);
    expect(issueFitsTopics(["design"], topics)).toBe(true);
    expect(issueFitsTopics(["opinion", "longreads"], topics)).toBe(false);
  });
});

describe("links that need no account", () => {
  const id = "6addeb4fd53248af063f97f9";

  it("names the subscriber and verifies", () => {
    const token = manageToken(id);
    expect(token.startsWith(`${id}.`)).toBe(true);
    expect(readManageToken(token)).toBe(id);
  });

  it("is stable, so every link in every issue works", () => {
    expect(manageToken(id)).toBe(manageToken(id));
  });

  it("cannot be forged for another subscriber", () => {
    const other = "6addeb4fd53248af063f97fa";
    const forged = `${other}.${manageToken(id).split(".")[1]}`;
    expect(readManageToken(forged)).toBeNull();
  });

  it("rejects malformed tokens", () => {
    for (const bad of ["", "nope", `${id}.`, `.abc`, `${id}.abc.def`, "zzzzzzzzzzzzzzzzzzzzzzzz.abc", `${id}.${"0".repeat(32)}`]) {
      expect(readManageToken(bad)).toBeNull();
    }
  });
});

describe("the e-mail", () => {
  const issue = { subject: "Tuesday <script>", note: "First paragraph.\n\nSecond & last." };
  const stories = [{ title: 'A "quoted" <b>title</b>', standfirst: "Why it <matters>.", author: "Elena Duarte", mins: 9, url: "https://nova.test/article/a" }];
  const mail = issueMail("reader@example.com", manageToken("6addeb4fd53248af063f97f9"), issue, stories);

  it("escapes everything an editor typed in the HTML", () => {
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).not.toContain("<b>title</b>");
    expect(mail.html).toContain("&lt;script&gt;");
    expect(mail.html).toContain("Second &amp; last.");
  });

  it("carries a plain-text version with the links", () => {
    expect(mail.text).toContain("https://nova.test/article/a");
    expect(mail.text).toContain("/newsletter/manage?token=");
  });

  it("offers one-click unsubscribe to the mail client (RFC 8058)", () => {
    expect(mail.headers?.["List-Unsubscribe"]).toMatch(/^<https?:\/\/[^>]+\/api\/v1\/newsletter\/unsubscribe\?token=/);
    expect(mail.headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });
});

describe("schemas", () => {
  it("lower-cases the address and fills defaults", () => {
    expect(subscribeSchema.parse({ email: " Reader@Example.COM " })).toEqual({
      email: "reader@example.com",
      topics: [],
      frequency: "both",
      source: "unknown",
    });
  });

  it("refuses a bad address, an unknown frequency and a bad source", () => {
    expect(subscribeSchema.safeParse({ email: "nope" }).success).toBe(false);
    expect(subscribeSchema.safeParse({ email: "a@b.co", frequency: "daily" }).success).toBe(false);
    expect(subscribeSchema.safeParse({ email: "a@b.co", source: "<x>" }).success).toBe(false);
  });

  it("needs something to change", () => {
    expect(updatePreferencesSchema.safeParse({ token: "x".repeat(20) }).success).toBe(false);
    expect(updatePreferencesSchema.safeParse({ token: "x".repeat(20), frequency: "weekly" }).success).toBe(true);
  });

  it("limits an issue to eight stories", () => {
    const stories = Array.from({ length: 9 }, (_, i) => `story-${i}`);
    expect(issueInputSchema.safeParse({ kind: "friday", subject: "S", articles: stories }).success).toBe(false);
    expect(issueInputSchema.safeParse({ kind: "friday", subject: "S", articles: stories.slice(0, 8) }).success).toBe(true);
  });
});
