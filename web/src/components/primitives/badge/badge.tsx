import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/* Badge, Tag, Avatar — reference nova.css §8. */

const badgeVariants = cva(
  "inline-block font-sans text-overline font-bold tracking-overline uppercase transition-colors duration-180 ease-in-out",
  {
    variants: {
      variant: {
        default: "text-brand",
        opinion: "text-brand-2", // .badge--opinion
        boxed: "rounded-md bg-surface-sunk px-2 py-1 text-fg", // .badge--boxed
        invert: "text-bg", // .badge--invert
      },
      /** Over a photograph (.card--longread .badge). */
      tone: { default: "", photo: "text-white" },
    },
    defaultVariants: { variant: "default", tone: "default" },
  },
);

type BadgeStyle = VariantProps<typeof badgeVariants>;

/** Section kicker: small caps in accent. `opinion` uses the secondary accent. */
export function Badge({ variant, tone, className, ...props }: ComponentProps<"span"> & BadgeStyle) {
  return <span className={cn(badgeVariants({ variant, tone }), className)} {...props} />;
}

/** A badge that links (the article kicker links to its section). */
export function BadgeLink({ variant, tone, className, ...props }: ComponentProps<typeof Link> & BadgeStyle) {
  return <Link className={cn(badgeVariants({ variant, tone }), className)} {...props} />;
}

/* .tag — only the declarations the reference makes. A <button> tag keeps the
   browser's own button background, exactly as in the reference. */
const tagBase = [
  "inline-flex min-h-8 items-center rounded-full border border-strong px-3 py-1 text-caption text-meta",
  "transition-all duration-180 ease-in-out hover:border-fg hover:text-fg",
  "aria-pressed:border-fg aria-pressed:bg-fg aria-pressed:text-bg",
  "aria-[current=page]:border-fg aria-[current=page]:bg-fg aria-[current=page]:text-bg",
];

type TagProps = {
  /** Current/selected state (.tag.is-active). */
  active?: boolean;
  className?: string;
  children: ReactNode;
} & (
  | ({ href: string } & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">)
  | ({ href?: undefined } & Omit<ComponentProps<"button">, "className" | "children">)
);

/**
 * Topic pill. A link when it navigates (`href`), a toggle button otherwise
 * (pass `aria-pressed` for a filter chip).
 */
export function Tag({ active, className, ...props }: TagProps) {
  const cls = cn(tagBase, active && "border-fg bg-fg text-bg", className);
  if (props.href !== undefined) {
    return <Link className={cls} aria-current={active ? "page" : undefined} {...props} />;
  }
  return <button type="button" className={cls} {...(props as ComponentProps<"button">)} />;
}

const avatarVariants = cva(
  "inline-grid flex-none place-items-center rounded-full border border-border font-sans font-bold tracking-avatar",
  {
    variants: {
      size: {
        sm: "size-8 text-overline", // .avatar--sm
        md: "size-10 text-caption",
        lg: "size-16 text-body", // .avatar--lg
      },
      tone: {
        accent: "bg-brand-soft text-brand",
        opinion: "bg-brand-2-wash text-brand-2", // .avatar--2
      },
    },
    defaultVariants: { size: "md", tone: "accent" },
  },
);

/**
 * Typographic monogram. NOVA does not use stock photographs of people who are
 * not the writer, so the avatar is decorative — the name beside it is the label.
 */
export function Avatar({
  initials,
  size,
  tone,
  className,
}: VariantProps<typeof avatarVariants> & { initials: string; className?: string }) {
  return (
    <span aria-hidden="true" className={cn(avatarVariants({ size, tone }), className)}>
      {initials}
    </span>
  );
}
