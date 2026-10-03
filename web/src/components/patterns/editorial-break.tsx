import type { ReactNode } from "react";

import { Container } from "@/components/primitives";
import { cn } from "@/lib/utils";

/**
 * S4 · Full-bleed editorial break — reference nova.css §20 (.brk) and §22.
 * ONE per page, never two. The page goes to ink, a single sentence carries
 * the band, and the reader comes back out onto paper. Long-form uses its own
 * image band (LongformBreak) instead.
 */
export function EditorialBreak({
  id,
  kicker,
  quote,
  cite,
  story,
  className,
}: {
  id: string;
  kicker: ReactNode;
  quote: ReactNode;
  cite?: ReactNode;
  /** A story rather than a sentence: 7/5 split (.brk--story). */
  story?: ReactNode;
  className?: string;
}) {
  return (
    <aside
      aria-labelledby={id}
      className={cn(
        "my-16 bg-ink py-brk text-on-ink max-md:my-12",
        "[&_a]:text-on-ink [&_a]:underline [&_a]:decoration-1 [&_a]:underline-offset-4 [&_a:hover]:text-brand-hover [&_a:hover]:decoration-2",
        "print:bg-white! print:text-black!",
        className,
      )}
    >
      <Container
        className={cn(
          "grid gap-6",
          story == null
            ? "max-w-break"
            : "max-w-none grid-cols-hero items-center gap-16 max-lg:grid-cols-1 max-lg:gap-8",
        )}
      >
        <p
          id={id}
          className="border-b border-on-ink/22 pb-4 font-mono text-index tracking-index text-on-ink/62 uppercase"
        >
          {kicker}
        </p>
        <blockquote
          className={cn(
            "m-0 font-serif text-break leading-116 font-medium tracking-h2 text-balance text-on-ink",
            // the reference's Newsreader italic ships 400 and 600 only, so em at 500 is drawn at 400
            "[&_em]:font-normal [&_em]:italic fa:leading-160 fa:[&_em]:not-italic",
          )}
        >
          {quote}
        </blockquote>
        {cite && (
          <p className="text-caption text-on-ink/70 not-italic [&_b]:font-semibold [&_b]:text-on-ink">{cite}</p>
        )}
        {story}
      </Container>
    </aside>
  );
}
