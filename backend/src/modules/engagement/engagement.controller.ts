/**
 * Reader-engagement handlers. Everything here is per-person, so nothing is
 * cacheable: the router marks every response `no-store`.
 */
import type { Request, RequestHandler, Response } from "express";
import { badRequest, unauthorized } from "../../http/errors.js";
import { slugSchema } from "../content/content.schemas.js";
import { followKind, type ListQuery } from "./engagement.schemas.js";
import * as engagement from "./engagement.service.js";

const userId = (req: Request) => {
  if (!req.auth) throw unauthorized();
  return req.auth.userId;
};

/** Slugs and ids come from the path; a malformed one is a 400, not a database miss. */
const slug = (req: Request): string => {
  const parsed = slugSchema.safeParse(String(req.params.slug));
  if (!parsed.success) throw badRequest("Not a valid slug", "INVALID_SLUG");
  return parsed.data;
};
const id = (req: Request): string => String(req.params.id);

const kind = (req: Request) => {
  const parsed = followKind.safeParse(req.params.kind);
  if (!parsed.success) throw badRequest("Follow an author or a topic", "INVALID_FOLLOW_KIND");
  return parsed.data;
};

const viewer = (req: Request): engagement.Viewer => ({
  ...(req.auth ? { userId: req.auth.userId } : {}),
  ip: req.ip ?? req.socket.remoteAddress ?? "unknown",
  userAgent: String(req.headers["user-agent"] ?? ""),
});

const send = (res: Response, data: unknown, status = 200): void => {
  res.status(status).json({ data });
};

const h = (fn: (req: Request, res: Response) => Promise<void>): RequestHandler => fn;

export const engagementController = {
  view: h(async (req, res) => send(res, await engagement.recordView(viewer(req), slug(req)))),
  read: h(async (req, res) => send(res, await engagement.recordRead(viewer(req), slug(req)))),
  engagement: h(async (req, res) => send(res, await engagement.getEngagement(slug(req), req.auth?.userId))),

  like: h(async (req, res) => send(res, await engagement.setLike(userId(req), slug(req), true))),
  unlike: h(async (req, res) => send(res, await engagement.setLike(userId(req), slug(req), false))),

  listBookmarks: h(async (req, res) => {
    const { items, ...page } = await engagement.listBookmarks(userId(req), res.locals.query as ListQuery);
    res.json({ data: items, page });
  }),
  save: h(async (req, res) => send(res, await engagement.setBookmark(userId(req), slug(req), true))),
  unsave: h(async (req, res) => send(res, await engagement.setBookmark(userId(req), slug(req), false))),
  syncBookmarks: h(async (req, res) =>
    send(res, await engagement.syncBookmarks(userId(req), (req.body as { slugs: string[] }).slugs)),
  ),

  listCollections: h(async (req, res) => send(res, await engagement.listCollections(userId(req)))),
  createCollection: h(async (req, res) =>
    send(res, await engagement.createCollection(userId(req), (req.body as { name: string }).name), 201),
  ),
  getCollection: h(async (req, res) => send(res, await engagement.getCollection(userId(req), id(req)))),
  renameCollection: h(async (req, res) =>
    send(res, await engagement.renameCollection(userId(req), id(req), (req.body as { name: string }).name)),
  ),
  deleteCollection: h(async (req, res) => {
    await engagement.deleteCollection(userId(req), id(req));
    res.status(204).end();
  }),
  addToCollection: h(async (req, res) => send(res, await engagement.setInCollection(userId(req), id(req), slug(req), true))),
  removeFromCollection: h(async (req, res) =>
    send(res, await engagement.setInCollection(userId(req), id(req), slug(req), false)),
  ),

  listFollows: h(async (req, res) => send(res, await engagement.listFollows(userId(req)))),
  follow: h(async (req, res) => send(res, await engagement.setFollow(userId(req), kind(req), slug(req), true))),
  unfollow: h(async (req, res) => send(res, await engagement.setFollow(userId(req), kind(req), slug(req), false))),

  history: h(async (req, res) =>
    send(res, await engagement.listHistory(userId(req), (res.locals.query as { limit: number }).limit)),
  ),
  clearHistory: h(async (req, res) => {
    await engagement.clearHistory(userId(req));
    res.status(204).end();
  }),

  reportBrokenLink: h(async (req, res) => {
    await engagement.reportBrokenLink(req.body as { path: string; referrer?: string });
    res.status(202).json({ data: { ok: true } });
  }),
};
