/** Comment thread — verbatim from blog-refrence/article.html. */
export type CommentRecord = {
  id: string;
  author: string;
  initials: string;
  badge?: "Subscriber" | "Author";
  time: string;
  likes: number;
  reply?: boolean;
  moderated?: boolean;
  body: string;
};

export const comments: CommentRecord[] = [
  {
    id: "c1",
    author: "Jonas Rehn",
    initials: "JR",
    badge: "Subscriber",
    time: "2 hours ago",
    likes: 34,
    body: "The “make refusal cheap” point is the one teams skip. We shipped a suggestion surface last year with a dismiss action buried in an overflow menu, and the telemetry made it look like users loved the suggestions. They just could not find the exit.",
  },
  {
    id: "c2",
    author: "Elena Duarte",
    initials: "ED",
    badge: "Author",
    time: "1 hour ago",
    likes: 52,
    reply: true,
    body: "That matches what two of the four teams told me, and it is why I did not use engagement figures anywhere in the piece. If you are able to share the telemetry shape, my contact details are on my author page.",
  },
  {
    id: "c3",
    author: "Marta Pereira",
    initials: "MP",
    time: "4 hours ago",
    likes: 28,
    body: "Portability is the right thing to watch. Everything else in this space is a UI question; that one is a market-structure question, and it will be decided by procurement departments long before it is decided by designers.",
  },
  {
    id: "c4",
    author: "Comment removed",
    initials: "—",
    time: "5 hours ago",
    likes: 0,
    moderated: true,
    body: "Removed by a moderator for personal abuse. The author has been notified and may edit and repost once.",
  },
];
