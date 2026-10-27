/**
 * Admin handlers. Role gates live in the route map; ownership and workflow
 * rules live in the services. Successes render `{ data }`.
 */
import type { Request, RequestHandler, Response } from "express";
import { unauthorized } from "../../http/errors.js";
import type { Actor } from "../../services/audit.service.js";
import * as admin from "./admin.service.js";
import * as articles from "./articles.service.js";
import * as comments from "../comments/comments.service.js";
import * as placements from "../placements/placements.service.js";
import * as newsletter from "../newsletter/newsletter.service.js";
import * as searching from "../search/search.service.js";
import * as stats from "./stats.service.js";
import { permissionMatrix } from "../../http/permissions.js";
import * as engagement from "../engagement/engagement.service.js";
import type { AdminListQuery, ChangeStatusInput, CreateArticleInput, UpdateArticleInput } from "./admin.schemas.js";

const actorOf = (req: Request): Actor => {
  if (!req.auth) throw unauthorized();
  return { id: req.auth.userId, role: req.auth.role };
};
const param = (req: Request, name: string): string => String(req.params[name]);
const query = <T>(res: Response): T => res.locals.query as T;
const send = (res: Response, data: unknown, status = 200): void => {
  res.status(status).json({ data });
};
const paged = (res: Response, { items, ...page }: { items: unknown[]; total: number; page: number; limit: number }): void => {
  res.json({ data: items, page });
};

const h = (fn: (req: Request, res: Response) => Promise<void>): RequestHandler => fn;

export const adminController = {
  /* overview */
  stats: h(async (req, res) => send(res, await stats.overview(actorOf(req), query<{ days: number }>(res).days))),
  permissions: h(async (_req, res) => send(res, permissionMatrix())),

  /* articles */
  listArticles: h(async (req, res) => paged(res, await articles.listArticles(actorOf(req), query<AdminListQuery>(res)))),
  getArticle: h(async (req, res) => send(res, await articles.getArticle(actorOf(req), param(req, "id")))),
  createArticle: h(async (req, res) => send(res, await articles.createArticle(actorOf(req), req.body as CreateArticleInput), 201)),
  updateArticle: h(async (req, res) =>
    send(res, await articles.updateArticle(actorOf(req), param(req, "id"), req.body as UpdateArticleInput)),
  ),
  changeStatus: h(async (req, res) =>
    send(res, await articles.changeStatus(actorOf(req), param(req, "id"), req.body as ChangeStatusInput)),
  ),
  deleteArticle: h(async (req, res) => {
    await articles.deleteArticle(actorOf(req), param(req, "id"));
    res.status(204).end();
  }),
  listRevisions: h(async (req, res) => send(res, await articles.listRevisions(actorOf(req), param(req, "id")))),
  getRevision: h(async (req, res) =>
    send(res, await articles.getRevision(actorOf(req), param(req, "id"), Number(param(req, "version")))),
  ),
  restoreRevision: h(async (req, res) =>
    send(res, await articles.restoreRevision(actorOf(req), param(req, "id"), Number(param(req, "version")))),
  ),

  /* users */
  listUsers: h(async (_req, res) => paged(res, await admin.listUsers(query(res)))),
  updateUser: h(async (req, res) => send(res, await admin.updateUser(actorOf(req), param(req, "id"), req.body))),

  /* directories */
  createAuthor: h(async (req, res) => send(res, await admin.createAuthor(actorOf(req), req.body), 201)),
  updateAuthor: h(async (req, res) => send(res, await admin.updateAuthor(actorOf(req), param(req, "slug"), req.body))),
  deleteAuthor: h(async (req, res) => {
    await admin.deleteAuthor(actorOf(req), param(req, "slug"));
    res.status(204).end();
  }),
  createSection: h(async (req, res) => send(res, await admin.createSection(actorOf(req), req.body), 201)),
  updateSection: h(async (req, res) => send(res, await admin.updateSection(actorOf(req), param(req, "slug"), req.body))),
  deleteSection: h(async (req, res) => {
    await admin.deleteSection(actorOf(req), param(req, "slug"));
    res.status(204).end();
  }),
  createTopic: h(async (req, res) => send(res, await admin.createTopic(actorOf(req), req.body), 201)),
  updateTopic: h(async (req, res) => send(res, await admin.updateTopic(actorOf(req), param(req, "slug"), req.body))),
  deleteTopic: h(async (req, res) => {
    await admin.deleteTopic(actorOf(req), param(req, "slug"));
    res.status(204).end();
  }),

  /* media */
  signUpload: h(async (_req, res) => send(res, admin.signUpload())),
  registerMedia: h(async (req, res) => send(res, await admin.registerMedia(actorOf(req), req.body), 201)),
  listMedia: h(async (_req, res) => paged(res, await admin.listMedia(query(res)))),

  /* broken-link reports */
  listReports: h(async (_req, res) => paged(res, await engagement.listBrokenLinks(query(res)))),
  resolveReport: h(async (req, res) => {
    await engagement.resolveBrokenLink(param(req, "id"));
    res.status(204).end();
  }),

  /* comment moderation */
  listComments: h(async (_req, res) => paged(res, await comments.listQueue(query(res)))),
  approveComment: h(async (req, res) => {
    await comments.approveComment(actorOf(req), param(req, "id"));
    res.status(204).end();
  }),
  removeComment: h(async (req, res) => {
    await comments.removeComment(actorOf(req), param(req, "id"), (req.body as { reason: string }).reason);
    res.status(204).end();
  }),

  /* front page */
  getHomePlacement: h(async (_req, res) => send(res, await placements.getHomeForEditing())),
  putHomePlacement: h(async (req, res) => send(res, await placements.setHome(actorOf(req), req.body))),

  /* newsletter */
  listIssues: h(async (_req, res) => paged(res, await newsletter.listIssues(query(res)))),
  getIssue: h(async (req, res) => send(res, await newsletter.getIssue(param(req, "id")))),
  createIssue: h(async (req, res) => send(res, await newsletter.createIssue(actorOf(req), req.body), 201)),
  updateIssue: h(async (req, res) => send(res, await newsletter.updateIssue(actorOf(req), param(req, "id"), req.body))),
  deleteIssue: h(async (req, res) => {
    await newsletter.deleteIssue(actorOf(req), param(req, "id"));
    res.status(204).end();
  }),
  testIssue: h(async (req, res) => send(res, await newsletter.sendTest(actorOf(req), param(req, "id")))),
  scheduleIssue: h(async (req, res) => send(res, await newsletter.scheduleIssue(actorOf(req), param(req, "id"), req.body.at))),
  unscheduleIssue: h(async (req, res) => send(res, await newsletter.unscheduleIssue(actorOf(req), param(req, "id")))),
  sendIssue: h(async (req, res) => send(res, await newsletter.sendIssue(actorOf(req), param(req, "id")))),
  listSubscribers: h(async (_req, res) => {
    const { items, ...page } = await newsletter.listSubscribers(query(res));
    res.json({ data: items, page });
  }),
  deleteSubscriber: h(async (req, res) => {
    await newsletter.deleteSubscriber(actorOf(req), param(req, "id"));
    res.status(204).end();
  }),

  /* search terms */
  listSearchTerms: h(async (_req, res) => paged(res, await searching.listSearchTerms(query(res)))),

  /* audit */
  listAudit: h(async (_req, res) => paged(res, await admin.listAudit(query(res)))),
};
