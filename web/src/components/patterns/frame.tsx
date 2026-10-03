import Image from "next/image";
import type { ReactNode } from "react";

import { BigNum } from "@/components/primitives";
import { cn } from "@/lib/utils";

/*
 * S5 · Ratio-locked image frame — reference nova.css §20 (.frame) and the
 * prose amendments in §24. The container takes the ratio; the image never
 * negotiates. Ratios are a closed set: a page cannot invent a crop.
 */

/** `auto` keeps the image's own ratio (plain .frame); `natural` also refuses to crop. */
export type FrameRatio = "3x2" | "4x5" | "1x1" | "16x9" | "20x9" | "natural" | "auto";

const RATIO: Record<FrameRatio, string> = {
  "3x2": "aspect-3/2",
  "4x5": "aspect-4/5",
  "1x1": "aspect-square",
  "16x9": "aspect-video",
  "20x9": "aspect-20/9",
  natural: "aspect-auto object-contain", // .frame--natural
  auto: "aspect-auto",
};

/* .frame--top / .frame--bottom move the crop focus */
const FOCUS = { center: "object-center", top: "object-[50%_22%]", bottom: "object-[50%_78%]" } as const;

/* Width per placement. In the article measure a wide frame reaches 4rem past
   it on both sides (§24 --outset); below 1024px the measure already fills the
   page, so it stays inside (the reference loses that collapse: §Deviations). */
const SIZE = {
  default: "",
  wide: "mx-auto w-frame-wide", // .frame--wide
  "wide-prose": "-mx-outset w-outset-full max-lg:mx-0 max-lg:w-full", // .prose .frame--wide
  bleed: "mx-bleed-x w-screen", // .frame--bleed
} as const;

export function Frame({
  src,
  alt,
  ratio = "3x2",
  focus = "center",
  width = 1600,
  height = 1067,
  sizes = "(max-width: 768px) 100vw, 50vw",
  caption,
  credit,
  size,
  inProse,
  eager,
  className,
  imageClassName,
}: {
  src: string;
  /** Describe the picture; "" only for decorative images. */
  alt: string;
  ratio?: FrameRatio;
  focus?: keyof typeof FOCUS;
  width?: number;
  height?: number;
  sizes?: string;
  caption?: ReactNode;
  credit?: ReactNode;
  /** Break out of the measure (`wide`) or the page (`bleed`). */
  size?: "wide" | "bleed";
  /** Rendered inside the article body (.prose .frame). */
  inProse?: boolean;
  /** Above the fold: load immediately with high priority (Next 16 replaced `priority`). */
  eager?: boolean;
  className?: string;
  /** Behaviour the parent adds to the image (a card's hover zoom). */
  imageClassName?: string;
}) {
  const placement = size === "wide" && inProse ? "wide-prose" : (size ?? "default");
  return (
    <figure className={cn("m-0 block", inProse && "my-12", SIZE[placement], className)}>
      <span className="block overflow-hidden bg-skeleton">
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          loading={eager ? "eager" : undefined}
          fetchPriority={eager ? "high" : undefined}
          className={cn("block h-auto w-full object-cover", RATIO[ratio], FOCUS[focus], imageClassName)}
        />
      </span>
      {(caption || credit) && (
        <figcaption className={cn(CAPTION, size === "bleed" && "mx-auto w-wrap")}>
          {caption && <span>{caption}</span>}
          {credit && <FrameCredit>{credit}</FrameCredit>}
        </figcaption>
      )}
    </figure>
  );
}

/** .frame__cap — the hairline-ruled caption under a frame. */
const CAPTION = "mt-3 flex items-baseline gap-3 border-t border-border pt-3 text-caption leading-150 text-meta max-sm:flex-wrap";

/**
 * .portrait-slot — a 4:5 frame holding a typographic monogram where no
 * commissioned portrait exists. NOVA never stands in a photo of someone else.
 */
export function PortraitSlot({ initials, name, caption }: { initials: string; name: string; caption: ReactNode }) {
  return (
    <figure className="m-0 block">
      <span className="block overflow-hidden bg-skeleton">
        <span className="grid aspect-4/5 place-items-center border border-border bg-surface-sunk">
          <BigNum aria-hidden="true">{initials}</BigNum>
          <span className="sr-only">{name}</span>
        </span>
      </span>
      <figcaption className={CAPTION}>
        <span>{caption}</span>
      </figcaption>
    </figure>
  );
}

/** .frame__credit — the photographer line, also used by the long-form image band. */
export function FrameCredit({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "ms-auto font-mono text-index tracking-index whitespace-nowrap text-muted-soft uppercase max-sm:ms-0",
        className,
      )}
    >
      {children}
    </span>
  );
}
