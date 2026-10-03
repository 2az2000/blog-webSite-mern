import Link from "next/link";
import type { ReactNode } from "react";

import type { Locale } from "@/i18n/config";
import { formatIndex } from "@/lib/format";
import { cn } from "@/lib/utils";

/* S1 · Indexed section divider — reference nova.css §20 (.sec-head) and §22. */

type Weight = "default" | "major" | "quiet" | "accent";

const ROOT: Record<Weight, string> = {
  default: "border-strong",
  major: "border-t-2 border-fg pt-4 mb-12 max-md:mb-8", // .sec-head--major
  quiet: "border-border mb-6", // .sec-head--quiet
  accent: "border-brand-2", // .sec-head--accent
};
const INDEX: Record<Weight, string> = {
  default: "text-brand",
  major: "text-brand",
  quiet: "text-muted-soft",
  accent: "text-brand-2",
};
const TITLE: Record<Weight, string> = {
  default: "",
  major: "font-serif text-h3 font-semibold tracking-h3 normal-case",
  quiet: "font-semibold text-meta",
  accent: "",
};

/** .sec-head__link — the quiet action (or note) in the right slot. */
export const secHeadLink = "text-caption font-550 whitespace-nowrap text-meta transition-colors duration-180 ease-in-out";

type SecHeadProps = {
  /** Section number printed on the rule (01, 02 …). */
  index: number;
  title: ReactNode;
  /** So the section can be `aria-labelledby` its title. */
  id?: string;
  locale: Locale;
  /**
   * Four weights, one component. Alternating them down a page produces the
   * large → quiet → dense rhythm; a homepage runs major, quiet, accent.
   */
  weight?: Weight;
  note?: ReactNode;
  /** An action (`href`) or a plain note (no `href` — no arrow, no hover). */
  link?: { label: ReactNode; href?: string };
  /** Any control in the link slot (a sort menu, tabs, a button). Replaces `link`. */
  action?: ReactNode;
  as?: "h2" | "h3";
  className?: string;
};

export function SecHead({
  index,
  title,
  id,
  locale,
  weight = "default",
  note,
  link,
  action,
  as: Heading = "h2",
  className,
}: SecHeadProps) {
  return (
    <div
      className={cn(
        "mb-8 grid grid-cols-sandwich items-baseline gap-x-4 gap-y-1 border-t pt-3",
        "max-md:grid-cols-fill-auto max-md:gap-x-3",
        ROOT[weight],
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "self-start pt-[0.35em] font-mono text-index font-medium tracking-index uppercase tabular-nums",
          "before:me-[0.35em] before:opacity-55 before:content-['§']",
          "max-md:col-span-full max-md:mb-1 max-md:pt-0",
          INDEX[weight],
        )}
      >
        {formatIndex(index, locale)}
      </span>
      <Heading
        id={id}
        className={cn("font-sans text-label leading-130 font-650 tracking-overline text-fg uppercase", TITLE[weight])}
      >
        {title}
      </Heading>
      {action}
      {!action &&
        link &&
        (link.href ? (
          <Link
            href={link.href}
            className={cn(secHeadLink, "hover:text-brand", "after:content-['_→'] rtl:after:content-['_←']")}
          >
            {link.label}
          </Link>
        ) : (
          <span className={cn(secHeadLink, "text-muted-soft")}>{link.label}</span>
        ))}
      {note && (
        <p className="col-start-2 mt-1 max-w-ch-52 text-caption leading-150 text-meta max-md:col-span-full">{note}</p>
      )}
    </div>
  );
}

/** .sec-mark — the fifth state of S1: no rule, no title, a centred typographic breath. */
export function SecMark({ children = "NOVA" }: { children?: ReactNode }) {
  return (
    <p
      aria-hidden="true"
      className={cn(
        "grid place-items-center gap-3 py-12 text-muted-soft max-md:py-8",
        "before:h-6 before:w-px before:bg-strong before:content-['']",
        "after:h-6 after:w-px after:bg-strong after:content-['']",
      )}
    >
      <span className="indent-[0.4em] font-serif text-h4 leading-none tracking-mark">{children}</span>
    </p>
  );
}
