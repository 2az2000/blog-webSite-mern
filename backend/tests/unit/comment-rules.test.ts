import { describe, expect, it } from "vitest";
import {
  EDIT_WINDOW_MS,
  assess,
  countLinks,
  editBlocked,
  initialsOf,
  normalizeBody,
} from "../../src/modules/comments/comment-rules.js";

describe("normalizeBody", () => {
  it("trims, unifies line endings and limits blank lines", () => {
    expect(normalizeBody("  hello  \r\n\r\n\r\n\r\nworld  ")).toBe("hello\n\nworld");
  });

  it("drops control characters but keeps text in any script", () => {
    expect(normalizeBody("a\u0000b\u0007c")).toBe("abc");
    expect(normalizeBody("سلام دنیا")).toBe("سلام دنیا");
  });
});

describe("countLinks", () => {
  it("counts http(s) and www addresses", () => {
    expect(countLinks("see https://a.example/x and www.b.example, also http://c.example")).toBe(3);
    expect(countLinks("no links here, just example.com in words")).toBe(0);
  });
});

describe("assess", () => {
  const fine = "This is a considered reply to the reporting.";

  it("publishes an ordinary comment", () => {
    expect(assess(fine, false)).toEqual({ status: "published" });
  });

  it("holds a comment under ten characters", () => {
    expect(assess("too short", true)).toEqual({ status: "held", reason: "short" });
    expect(assess("ten chars!", true).status).toBe("published");
  });

  it("holds more than two links, whoever wrote them", () => {
    const spam = `${fine} https://a.example https://b.example https://c.example`;
    expect(assess(spam, true)).toEqual({ status: "held", reason: "links" });
  });

  it("holds a first comment that carries a link, but trusts one link from a regular", () => {
    const withLink = `${fine} https://source.example/report`;
    expect(assess(withLink, false)).toEqual({ status: "held", reason: "first-link" });
    expect(assess(withLink, true)).toEqual({ status: "published" });
  });
});

describe("editBlocked", () => {
  const now = Date.now();
  const fresh = { editCount: 0, createdAt: new Date(now - 60_000) };

  it("allows one edit within a day", () => {
    expect(editBlocked(fresh, now)).toBeNull();
  });

  it("refuses a second edit, a late edit, and a deleted comment", () => {
    expect(editBlocked({ ...fresh, editCount: 1 }, now)).toBe("used");
    expect(editBlocked({ ...fresh, createdAt: new Date(now - EDIT_WINDOW_MS - 1) }, now)).toBe("expired");
    expect(editBlocked({ ...fresh, removedBy: "author" }, now)).toBe("deleted");
  });

  it("lets the author repost after a moderator's removal", () => {
    expect(editBlocked({ ...fresh, removedBy: "moderator" }, now)).toBeNull();
  });
});

describe("initialsOf", () => {
  it("takes up to two initials", () => {
    expect(initialsOf("Jonas Rehn")).toBe("JR");
    expect(initialsOf("madonna")).toBe("M");
    expect(initialsOf("A B C")).toBe("AB");
    expect(initialsOf("")).toBe("?");
  });
});
