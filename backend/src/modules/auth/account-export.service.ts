/**
 * "Give me my data." Everything NOVA holds about one reader, as one JSON
 * document: the account, what they did, what they wrote, and the Dispatch
 * subscription on their address. Secrets (password hash, token hashes) are not
 * data about the reader and are never included.
 */
import type { Types } from "mongoose";
import { BookmarkModel } from "../../models/bookmark.model.js";
import { CollectionModel } from "../../models/collection.model.js";
import { CommentLikeModel, CommentModel, CommentReportModel } from "../../models/comment.model.js";
import { FollowModel } from "../../models/follow.model.js";
import { LikeModel } from "../../models/like.model.js";
import { MediaModel } from "../../models/media.model.js";
import { SubscriberModel } from "../../models/newsletter.model.js";
import { ReadEventModel } from "../../models/read-event.model.js";
import { SessionModel } from "../../models/session.model.js";
import { UserModel } from "../../models/user.model.js";
import { notFound } from "../../http/errors.js";

export async function exportUserData(userId: Types.ObjectId) {
  const user = await UserModel.findById(userId, { name: 1, email: 1, role: 1, status: 1, emailVerified: 1, terms: 1, createdAt: 1 }).lean();
  if (!user) throw notFound("Account not found", "ACCOUNT_NOT_FOUND");

  const [sessions, bookmarks, likes, follows, collections, comments, commentLikes, commentReports, history, media, subscription] = await Promise.all([
    SessionModel.find({ userId }, { userAgent: 1, ip: 1, createdAt: 1, expiresAt: 1, revokedAt: 1 }).lean(),
    BookmarkModel.find({ user: userId }, { article: 1, createdAt: 1 }).sort({ createdAt: -1 }).lean(),
    LikeModel.find({ user: userId }, { article: 1, createdAt: 1 }).lean(),
    FollowModel.find({ user: userId }, { kind: 1, slug: 1, createdAt: 1 }).lean(),
    CollectionModel.find({ user: userId }, { name: 1, articles: 1, createdAt: 1 }).lean(),
    CommentModel.find({ user: userId }, { article: 1, parent: 1, body: 1, status: 1, createdAt: 1, editedAt: 1 }).lean(),
    CommentLikeModel.find({ user: userId }, { comment: 1, createdAt: 1 }).lean(),
    CommentReportModel.find({ user: userId }, { comment: 1, reason: 1, note: 1, createdAt: 1 }).lean(),
    ReadEventModel.find({ user: userId }, { article: 1, day: 1, completed: 1 }).sort({ day: -1 }).lean(),
    MediaModel.find({ uploadedBy: userId }, { url: 1, alt: 1, credit: 1, createdAt: 1 }).lean(),
    SubscriberModel.findOne({ email: user.email }, { status: 1, frequency: 1, topics: 1, source: 1, consentAt: 1, consentVersion: 1, confirmedAt: 1, unsubscribedAt: 1 }).lean(),
  ]);

  const clean = <T extends { _id?: unknown; __v?: unknown }>(rows: T[]) => rows.map(({ _id, __v, ...rest }) => ({ id: String(_id), ...rest }));

  return {
    exportedAt: new Date().toISOString(),
    account: { id: user._id.toString(), name: user.name, email: user.email, role: user.role, status: user.status, emailVerified: user.emailVerified, termsAccepted: user.terms ?? null, createdAt: user.createdAt },
    sessions: clean(sessions),
    savedArticles: clean(bookmarks),
    likedArticles: clean(likes),
    follows: clean(follows),
    collections: clean(collections),
    comments: clean(comments),
    likedComments: clean(commentLikes),
    commentReports: clean(commentReports),
    readingHistory: clean(history),
    uploadedImages: clean(media),
    dispatchSubscription: subscription ? clean([subscription])[0] : null,
  };
}

/** The Dispatch subscription on the account's address goes with the account. */
export async function purgeSubscription(email: string): Promise<void> {
  await SubscriberModel.deleteOne({ email: email.toLowerCase() });
}
