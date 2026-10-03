import type { ComponentProps, ReactNode } from "react";

import { IconAlert, IconCheck, IconInfo } from "@/components/primitives";
import { cn } from "@/lib/utils";

/* Notices, skeletons, empty states, panels — reference nova.css §15, §16, §20. */

type NoticeTone = "info" | "success" | "warning" | "error";

const NOTICE: Record<NoticeTone, { border: string; icon: ReactNode; color: string }> = {
  info: { border: "border-s-meta", icon: <IconInfo />, color: "" },
  success: { border: "border-s-success", icon: <IconCheck />, color: "[&_svg]:text-success" },
  warning: { border: "border-s-warning", icon: <IconAlert />, color: "[&_svg]:text-warning" },
  error: { border: "border-s-error", icon: <IconAlert />, color: "[&_svg]:text-error" },
};

/** .notice — an icon and a word, never colour alone. */
export function Notice({
  tone = "info",
  bareIcon,
  className,
  children,
  ...props
}: ComponentProps<"div"> & {
  tone?: NoticeTone;
  /** The icon as a direct child (article.html) instead of wrapped in a span (states.html). */
  bareIcon?: boolean;
}) {
  const t = NOTICE[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-md border border-s-3 border-border bg-surface p-4 text-caption",
        "[&_svg]:mt-px [&_svg]:size-4.5 [&_svg]:flex-none",
        t.border,
        t.color,
        className,
      )}
      {...props}
    >
      {bareIcon ? t.icon : <span aria-hidden="true">{t.icon}</span>}
      <span>{children}</span>
    </div>
  );
}

const SHAPE = {
  media: "aspect-3/2 w-full rounded-none",
  line: "h-3",
  title: "h-6",
  display: "h-10.5",
  thumb: "size-24",
} as const;

/** .skeleton — shaped like the editorial element it replaces. */
export function Skeleton({
  shape = "line",
  length,
  className,
}: {
  shape?: keyof typeof SHAPE;
  length?: "short" | "mid";
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden rounded-md bg-skeleton",
        "after:absolute after:inset-0 after:animate-sheen after:content-[''] rtl:after:animate-sheen-rtl",
        "after:bg-linear-to-r after:from-transparent after:via-skeleton-sheen after:to-transparent",
        SHAPE[shape],
        shape === "line" && length === "short" && "w-2/5",
        shape === "line" && length === "mid" && "w-7/10",
        className,
      )}
    />
  );
}

/** .skeleton-card */
export function SkeletonStack({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("grid gap-3", className)} {...props} />;
}

/** Skeletons match the editorial shape they replace — this one is a default card. */
export function SkeletonCard({ label }: { label?: string }) {
  return (
    <SkeletonStack role={label ? "status" : undefined} aria-label={label}>
      <Skeleton shape="media" />
      <Skeleton shape="title" />
      <Skeleton />
      <Skeleton length="short" />
    </SkeletonStack>
  );
}

/** .empty-state — names the reason and offers the next action. */
export function EmptyState({
  mark = "∅",
  title,
  children,
  actions,
  footer,
  headingLevel = 3,
  className,
}: {
  mark?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  /** A closing line under the actions (e.g. alternative suggestions). */
  footer?: ReactNode;
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const H = `h${headingLevel}` as const;
  return (
    <div
      className={cn(
        "mx-auto grid max-w-empty justify-items-center gap-4 rounded-xl border border-dashed border-strong px-6 py-16 text-center",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="grid size-18 place-items-center rounded-full border-2 border-fg font-serif text-rank [&_svg]:size-7.5"
      >
        {mark}
      </span>
      <H className="font-serif text-h3">{title}</H>
      {children && <p className="max-w-ch-46 text-meta">{children}</p>}
      {actions && <div className="flex flex-wrap items-center justify-center gap-3 *:min-w-0">{actions}</div>}
      {footer && <p className="mt-4 text-caption leading-tight text-meta">{footer}</p>}
    </div>
  );
}

const PANEL = {
  default: "border-border bg-surface",
  elevated: "border-border bg-surface-2 shadow-raised", // .panel--elevated
  sunk: "border-transparent bg-surface-sunk", // .panel--sunk
} as const;

/** The .panel look, for elements that are not a div (a composer <form>). */
export function panelClass(variant: keyof typeof PANEL = "default") {
  return cn("rounded-md border p-8 max-md:p-6", PANEL[variant]);
}

/** .panel */
export function Panel({
  variant = "default",
  className,
  ...props
}: ComponentProps<"div"> & { variant?: keyof typeof PANEL }) {
  return <div className={cn(panelClass(variant), className)} {...props} />;
}
