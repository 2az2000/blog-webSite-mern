import Link from "next/link";
import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

/*
 * The one Button family — shadcn's Button shape (cva + Slot + data-slot),
 * NOVA's look: reference §6 `.btn`, §5 `.icon-btn`, §11 `.share__btn`.
 *   <Button>      an action
 *   <ButtonLink>  navigation that looks like a button (next/link)
 *   <IconButton>  a square or round icon-only control (aria-label required)
 *
 * The reference restyled buttons from outside (.newsletter-form .btn,
 * .category-hero .btn, .lf-chapters__actions .btn); here those are the
 * `tone`, `align` and `flush` variants.
 */

export const buttonVariants = cva(
  [
    "relative inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-transparent px-6 py-3",
    "text-center font-sans text-label leading-120 font-semibold",
    "[transition:background-color_var(--duration-fast)_var(--ease-in-out),border-color_var(--duration-fast)_var(--ease-in-out),color_var(--duration-fast)_var(--ease-in-out),translate_var(--duration-fast)_var(--ease-out)]",
    "active:translate-y-px [&_svg]:size-4.5 [&_svg]:flex-none",
    "disabled:pointer-events-none disabled:translate-none disabled:cursor-not-allowed disabled:opacity-45",
    "aria-disabled:pointer-events-none aria-disabled:translate-none aria-disabled:cursor-not-allowed aria-disabled:opacity-45",
  ],
  {
    variants: {
      variant: {
        primary: "bg-fg text-bg hover:bg-brand hover:text-on-brand",
        accent: "bg-brand text-on-brand hover:bg-brand-hover",
        secondary: "border-strong bg-transparent text-fg hover:border-fg hover:bg-surface-sunk",
        ghost: "bg-transparent px-3 text-meta hover:bg-surface-sunk hover:text-fg",
        danger: "border-current bg-transparent text-error hover:bg-error hover:text-surface",
      },
      size: {
        md: "",
        sm: "min-h-9 px-4 py-2 text-caption",
        inline: "min-h-0 px-1 py-2 text-caption", // .btn--sm.btn--inline: sits inside a sentence
      },
      /** The ground the button sits on: the theme's ink band, or a photograph. */
      tone: { default: "", ink: "", photo: "" },
      block: { true: "w-full" },
      flush: { true: "px-0" },
      align: { center: "", start: "justify-start" },
      /** Loading is a state, not a swap: the label stays, the width holds. */
      loading: {
        true: [
          "pointer-events-none text-transparent hover:text-transparent",
          "after:absolute after:inset-0 after:m-auto after:size-4.5 after:animate-spin after:rounded-full",
          "after:border-2 after:border-current after:border-t-transparent after:text-bg after:content-['']",
        ],
      },
      /** A pressed/unpressed toggle (bookmark): accent + filled icon when pressed. */
      toggle: { true: "" },
    },
    compoundVariants: [
      // .newsletter-form .btn--primary — on the ink band
      { tone: "ink", variant: "primary", class: "bg-on-ink text-ink hover:bg-brand hover:text-white" },
      // .category-hero / .lf-hero .btn--secondary — over a photograph
      {
        tone: "photo",
        variant: "secondary",
        class: "border-paper/40 text-paper hover:border-paper hover:bg-paper/10",
      },
      { loading: true, variant: ["secondary", "ghost"], class: "after:text-fg" },
      {
        toggle: true,
        class:
          "[&_svg]:transition-[scale] [&_svg]:duration-180 [&_svg]:ease-out aria-pressed:text-brand aria-pressed:[&_svg]:scale-108 aria-pressed:[&_svg]:fill-current",
      },
    ],
    defaultVariants: { variant: "primary", size: "md", tone: "default", align: "center" },
  },
);

export type ButtonStyleProps = VariantProps<typeof buttonVariants>;

type ButtonProps = Omit<ComponentProps<"button">, "type"> &
  ButtonStyleProps & {
    type?: "button" | "submit" | "reset";
    /** Render the child element with button styling (e.g. an anchor to a hash). */
    asChild?: boolean;
  };

export function Button({
  variant,
  size,
  tone,
  block,
  flush,
  align,
  loading,
  toggle,
  asChild,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, tone, block, flush, align, loading, toggle }), className)}
      aria-busy={loading || undefined}
      {...(!asChild && { type })}
      {...props}
    />
  );
}

/** Navigation styled as a button. */
export function ButtonLink({
  variant,
  size,
  tone,
  block,
  flush,
  align,
  className,
  ...props
}: ComponentProps<typeof Link> & Omit<ButtonStyleProps, "loading" | "toggle">) {
  return (
    <Link
      data-slot="button"
      className={cn(buttonVariants({ variant, size, tone, block, flush, align }), className)}
      {...props}
    />
  );
}

export const iconButtonVariants = cva("inline-grid cursor-pointer place-items-center p-0", {
  variants: {
    shape: {
      /* .icon-btn — 44×44 header control */
      square: [
        "size-11 rounded-md border border-transparent bg-transparent text-fg [&_svg]:size-5",
        "transition-[background-color,border-color] duration-180 ease-in-out",
        "hover:border-border hover:bg-surface-sunk active:bg-border",
      ],
      /* .share__btn — 40×40 share control */
      round: [
        "size-10 rounded-full border border-border bg-transparent text-meta [&_svg]:size-4",
        "transition-all duration-180 ease-in-out",
        "hover:-translate-y-0.5 hover:border-fg hover:text-fg",
      ],
    },
    /** .bookmark-btn — accent + filled glyph when aria-pressed. The theme
        switch is aria-pressed too and stays neutral, so this is opt-in. */
    toggle: {
      true: "[&_svg]:transition-[scale] [&_svg]:duration-180 [&_svg]:ease-out aria-pressed:text-brand aria-pressed:[&_svg]:scale-108 aria-pressed:[&_svg]:fill-current",
    },
  },
  defaultVariants: { shape: "square" },
});

type IconButtonProps = Omit<ComponentProps<"button">, "type"> & {
  /** Required: an icon-only control has no visible text. */
  "aria-label": string;
  /** `square` = 44px header control; `round` = 40px share control. */
  shape?: "square" | "round";
  toggle?: boolean;
  asChild?: boolean;
};

export function IconButton({ shape = "square", toggle, asChild, className, ...props }: IconButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="icon-button"
      className={cn(iconButtonVariants({ shape, toggle }), className)}
      {...(!asChild && { type: "button" as const })}
      {...props}
    />
  );
}
