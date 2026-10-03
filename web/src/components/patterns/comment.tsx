import type { ReactNode } from "react";

import { commentAction, LikeButton } from "@/components/patterns/actions";
import { Avatar, IconFlag, IconReply, Text } from "@/components/primitives";
import { cn } from "@/lib/utils";

/**
 * .comment — reference nova.css §14 (+ §18). Replies indent once and never
 * further; a moderated comment keeps its slot and states why it was removed.
 * Below 480px the monogram gives way to the text.
 */
export function Comment({
  author,
  initials,
  tone,
  badge,
  time,
  likes,
  reply,
  moderated,
  labels,
  children,
}: {
  author: string;
  initials: string;
  /** The article author replying gets the secondary tone. */
  tone?: "opinion";
  badge?: string;
  time: ReactNode;
  likes: number;
  reply?: boolean;
  moderated?: boolean;
  labels: { reply: string; report: string };
  children: ReactNode;
}) {
  return (
    <article
      className={cn(
        "grid grid-cols-lead gap-4 border-t border-border py-6 max-sm:grid-cols-1",
        reply && "ms-12 max-md:ms-6",
      )}
    >
      <Avatar initials={initials} size="sm" tone={tone} className="max-sm:hidden" />
      <div>
        <div className="mb-2 flex flex-wrap items-baseline gap-2">
          <span className="text-label font-650">{author}</span>
          {badge && (
            <span className="rounded-md border border-current px-1 text-overline tracking-badge text-brand uppercase fa:tracking-normal">
              {badge}
            </span>
          )}
          <Text as="span" variant="meta">
            {time}
          </Text>
        </div>
        <p className={cn("text-body-sm leading-160", moderated ? "text-meta italic" : "text-fg-soft")}>{children}</p>
        {!moderated && (
          <div className="mt-3 flex items-center gap-1">
            <LikeButton count={likes} />
            <button type="button" className={commentAction}>
              <IconReply />
              {labels.reply}
            </button>
            <button type="button" className={commentAction}>
              <IconFlag />
              {labels.report}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
