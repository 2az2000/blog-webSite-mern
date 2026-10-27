/**
 * Route map for `/api/v1/admin`. Everyone here is signed in with a staff role;
 * each route narrows it by *permission*, never by role name — the table of who
 * may do what is `http/permissions.ts`, and the Roles page prints that table.
 */
import { Router } from "express";
import { adminController as c } from "./admin.controller.js";
import {
  adminListQuery,
  auditQuery,
  authorBodySchema,
  authorPatchSchema,
  changeStatusSchema,
  createArticleSchema,
  homePlacementSchema,
  issueInputSchema,
  issuePatchSchema,
  issuesQuery,
  scheduleSchema,
  subscribersQuery,
  pageQuery,
  queueQuery,
  registerMediaSchema,
  removeCommentSchema,
  reportsQuery,
  sectionBodySchema,
  termsQuery,
  sectionPatchSchema,
  statsQuery,
  topicBodySchema,
  topicPatchSchema,
  updateArticleSchema,
  updateUserSchema,
  userListQuery,
} from "./admin.schemas.js";
import { requireAuth } from "../../http/auth.js";
import { can } from "../../http/permissions.js";
import { validate, validateQuery } from "../../http/validate.js";

export const adminRouter: Router = Router();

adminRouter.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
adminRouter.use(requireAuth, can("backoffice.enter"));

/* — overview and the permission table — */
adminRouter.get("/stats", can("stats.view"), validateQuery(statsQuery), c.stats);
adminRouter.get("/permissions", can("permissions.view"), c.permissions);

/* — articles — */
adminRouter.get("/articles", validateQuery(adminListQuery), c.listArticles);
adminRouter.post("/articles", validate(createArticleSchema), c.createArticle);
adminRouter.get("/articles/:id", c.getArticle);
adminRouter.patch("/articles/:id", validate(updateArticleSchema), c.updateArticle);
adminRouter.post("/articles/:id/status", can("articles.publish"), validate(changeStatusSchema), c.changeStatus);
adminRouter.delete("/articles/:id", can("articles.delete"), c.deleteArticle);
adminRouter.get("/articles/:id/revisions", c.listRevisions);
adminRouter.get("/articles/:id/revisions/:version", c.getRevision);
adminRouter.post("/articles/:id/revisions/:version/restore", c.restoreRevision);

/* — directories — */
adminRouter.post("/authors", can("directories.manage"), validate(authorBodySchema), c.createAuthor);
adminRouter.patch("/authors/:slug", can("directories.manage"), validate(authorPatchSchema), c.updateAuthor);
adminRouter.delete("/authors/:slug", can("directories.manage"), c.deleteAuthor);
adminRouter.post("/sections", can("directories.manage"), validate(sectionBodySchema), c.createSection);
adminRouter.patch("/sections/:slug", can("directories.manage"), validate(sectionPatchSchema), c.updateSection);
adminRouter.delete("/sections/:slug", can("directories.manage"), c.deleteSection);
adminRouter.post("/topics", can("directories.manage"), validate(topicBodySchema), c.createTopic);
adminRouter.patch("/topics/:slug", can("directories.manage"), validate(topicPatchSchema), c.updateTopic);
adminRouter.delete("/topics/:slug", can("directories.manage"), c.deleteTopic);

/* — media — */
adminRouter.post("/media/sign", can("media.upload"), c.signUpload);
adminRouter.post("/media", can("media.upload"), validate(registerMediaSchema), c.registerMedia);
adminRouter.get("/media", can("media.upload"), validateQuery(pageQuery), c.listMedia);

/* — broken-link reports from the 404 page — */
adminRouter.get("/reports", can("reports.manage"), validateQuery(reportsQuery), c.listReports);
adminRouter.post("/reports/:id/resolve", can("reports.manage"), c.resolveReport);

/* — front page placement — */
adminRouter.get("/placements/home", can("frontpage.edit"), c.getHomePlacement);
adminRouter.put("/placements/home", can("frontpage.edit"), validate(homePlacementSchema), c.putHomePlacement);

/* — the Dispatch — */
adminRouter.get("/newsletter/issues", can("newsletter.manage"), validateQuery(issuesQuery), c.listIssues);
adminRouter.post("/newsletter/issues", can("newsletter.manage"), validate(issueInputSchema), c.createIssue);
adminRouter.get("/newsletter/issues/:id", can("newsletter.manage"), c.getIssue);
adminRouter.patch("/newsletter/issues/:id", can("newsletter.manage"), validate(issuePatchSchema), c.updateIssue);
adminRouter.delete("/newsletter/issues/:id", can("newsletter.manage"), c.deleteIssue);
adminRouter.post("/newsletter/issues/:id/test", can("newsletter.manage"), c.testIssue);
adminRouter.post("/newsletter/issues/:id/schedule", can("newsletter.manage"), validate(scheduleSchema), c.scheduleIssue);
adminRouter.post("/newsletter/issues/:id/unschedule", can("newsletter.manage"), c.unscheduleIssue);
adminRouter.post("/newsletter/issues/:id/send", can("newsletter.manage"), c.sendIssue);
adminRouter.get("/newsletter/subscribers", can("newsletter.manage"), validateQuery(subscribersQuery), c.listSubscribers);
adminRouter.delete("/newsletter/subscribers/:id", can("newsletter.erase"), c.deleteSubscriber);

/* — what readers search for — */
adminRouter.get("/searches", can("searches.view"), validateQuery(termsQuery), c.listSearchTerms);

/* — comment moderation — */
adminRouter.get("/comments", can("comments.moderate"), validateQuery(queueQuery), c.listComments);
adminRouter.post("/comments/:id/approve", can("comments.moderate"), c.approveComment);
adminRouter.post("/comments/:id/remove", can("comments.moderate"), validate(removeCommentSchema), c.removeComment);

/* — accounts and audit (admin) — */
adminRouter.get("/users", can("users.manage"), validateQuery(userListQuery), c.listUsers);
adminRouter.patch("/users/:id", can("users.manage"), validate(updateUserSchema), c.updateUser);
adminRouter.get("/audit", can("audit.view"), validateQuery(auditQuery), c.listAudit);
