/**
 * Entry A (Vercel) and entry B (plain Node) must serve the same app.
 * The serverless module is imported exactly as Vercel does and asked for the
 * liveness route, which has to answer with no database at all.
 */
import { describe, expect, it } from "vitest";
import request from "supertest";
import handler from "../../api/index.js";
import { createApp } from "../../src/app.js";

describe("serverless entry", () => {
  it("exports an Express app that answers liveness without a database", async () => {
    const res = await request(handler).get("/api/v1/health").expect(200);
    expect(res.body).toEqual({ data: { status: "ok" } });
  });

  it("answers unknown /api routes with the standard envelope (no database needed)", async () => {
    const res = await request(handler).get("/api/nope").expect(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("is built by the same factory as the plain-Node entry", async () => {
    const res = await request(createApp()).get("/api/v1/health").expect(200);
    expect(res.body.data.status).toBe("ok");
  });
});
