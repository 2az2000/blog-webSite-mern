/** Comment handlers. Private to the caller (a thread differs per viewer): never cached. */
import type { Request, RequestHandler, Response } from "express";
import { badRequest, unauthorized } from "../../http/errors.js";
import { slugSchema } from "../content/content.schemas.js";
import type { ListCommentsQuery } from "./comments.schemas.js";
import * as comments from "./comments.service.js";

const userId = (req: Request) => {
  if (!req.auth) throw unauthorized();
  return req.auth.userId;
};
const slug = (req: Request): string => {
  const parsed = slugSchema.safeParse(String(req.params.slug));
  if (!parsed.success) throw badRequest("Not a valid slug", "INVALID_SLUG");
  return parsed.data;
};
const id = (req: Request): string => String(req.params.id);
const send = (res: Response, data: unknown, status = 200): void => {
  res.status(status).json({ data });
};
const h = (fn: (req: Request, res: Response) => Promise<void>): RequestHandler => fn;

export const commentsController = {
  list: h(async (req, res) => {
    const { items, ...page } = await comments.listComments(slug(req), res.locals.query as ListCommentsQuery, req.auth?.userId);
    res.json({ data: items, page });
  }),
  create: h(async (req, res) =>
    send(res, await comments.createComment(userId(req), slug(req), req.body as { body: string; parent?: string }), 201),
  ),
  edit: h(async (req, res) => send(res, await comments.editComment(userId(req), id(req), (req.body as { body: string }).body))),
  remove: h(async (req, res) => {
    await comments.deleteComment(userId(req), id(req));
    res.status(204).end();
  }),
  like: h(async (req, res) => send(res, await comments.setCommentLike(userId(req), id(req), true))),
  unlike: h(async (req, res) => send(res, await comments.setCommentLike(userId(req), id(req), false))),
  report: h(async (req, res) => {
    await comments.reportComment(userId(req), id(req), req.body as { reason: "spam" | "abuse" | "off-topic" | "other"; note?: string });
    res.status(202).json({ data: { reported: true } });
  }),
};
