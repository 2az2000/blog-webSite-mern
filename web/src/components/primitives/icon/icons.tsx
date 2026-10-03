import type { SVGProps } from "react";

import { cn } from "@/lib/utils";

/*
 * NOVA icon set — the exact paths from blog-refrence/assets/nova.js (NOVA.icons).
 * 24×24, stroke-based, currentColor, hidden from assistive technology: the
 * control that holds an icon carries the accessible name.
 * Size comes from the component CSS (e.g. `.btn svg { width: 18px }`), never
 * from a prop. Icons that encode direction mirror in RTL (rtl:-scale-x-100).
 */

type IconProps = Omit<SVGProps<SVGSVGElement>, "children">;

function make(
  name: string,
  body: React.ReactNode,
  opts: { strokeWidth?: number; fill?: boolean; directional?: boolean; round?: "cap" | "join" | "both" } = {},
) {
  const { strokeWidth = 1.5, fill = false, directional = false, round = "cap" } = opts;
  function Icon({ className, ...props }: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
        fill={fill ? "currentColor" : "none"}
        stroke={fill ? undefined : "currentColor"}
        strokeWidth={fill ? undefined : strokeWidth}
        strokeLinecap={!fill && round !== "join" ? "round" : undefined}
        strokeLinejoin={!fill && round !== "cap" ? "round" : undefined}
        className={cn(directional && "rtl:-scale-x-100", className)}
        {...props}
      >
        {body}
      </svg>
    );
  }
  Icon.displayName = `Icon${name}`;
  return Icon;
}

export const IconSearch = make("Search", <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>);
export const IconMenu = make("Menu", <path d="M4 7h16M4 12h16M4 17h16" />);
export const IconClose = make("Close", <path d="m6 6 12 12M18 6 6 18" />);
export const IconSun = make(
  "Sun",
  <><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" /></>,
);
export const IconMoon = make("Moon", <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4 8.2 8.2 0 1 0 20 14.2Z" />, { round: "both" });
export const IconBookmark = make(
  "Bookmark",
  <path d="M6.5 3.75h11a.75.75 0 0 1 .75.75v15.2l-6.25-3.9-6.25 3.9V4.5a.75.75 0 0 1 .75-.75Z" />,
  { round: "join" },
);
export const IconHeart = make("Heart", <path d="M12 20.3 4.6 13a4.6 4.6 0 0 1 6.5-6.5l.9.9.9-.9A4.6 4.6 0 1 1 19.4 13Z" />, { round: "join" });
export const IconReply = make("Reply", <><path d="M9 8 4.5 12 9 16" /><path d="M4.5 12h9a6 6 0 0 1 6 6v1" /></>, {
  round: "both",
  directional: true,
});
export const IconFlag = make("Flag", <path d="M6 21V4.5M6 5h10.5l-1.8 3.6 1.8 3.6H6" />, { round: "both" });
export const IconShare = make(
  "Share",
  <><path d="M12 15V4m0 0L8.5 7.5M12 4l3.5 3.5" /><path d="M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13" /></>,
  { round: "both" },
);
export const IconLink = make(
  "Link",
  <><path d="M10.5 13.5a3.5 3.5 0 0 0 5 0l3-3a3.54 3.54 0 0 0-5-5l-1.4 1.4" /><path d="M13.5 10.5a3.5 3.5 0 0 0-5 0l-3 3a3.54 3.54 0 0 0 5 5l1.4-1.4" /></>,
);
export const IconMail = make("Mail", <><rect x="3" y="5.5" width="18" height="13" rx="1.5" /><path d="m3.8 6.6 8.2 6 8.2-6" /></>, {
  round: "join",
});
// Media controls keep their orientation in RTL (they describe time, not reading order).
export const IconPlay = make("Play", <path d="M8 5.5v13l11-6.5Z" />, { fill: true });
export const IconCheck = make("Check", <path d="m5 12.5 4.5 4.5L19 7" />, { strokeWidth: 2, round: "both" });
export const IconMinus = make("Minus", <path d="M6 12h12" />, { strokeWidth: 2 });
export const IconAlert = make("Alert", <><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.3v.2" /></>, { strokeWidth: 1.7 });
export const IconInfo = make("Info", <><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.7v.2" /></>, { strokeWidth: 1.7 });
export const IconArrowUp = make("ArrowUp", <path d="M12 19V6m0 0-5 5m5-5 5 5" />, { strokeWidth: 2, round: "both" });
export const IconArrowDown = make("ArrowDown", <path d="M12 5v13m0 0 5-5m-5 5-5-5" />, { strokeWidth: 2, round: "both" });
/** Points "forward" — right in LTR, left in RTL. */
export const IconArrowForward = make("ArrowForward", <path d="M5 12h13m0 0-5-5m5 5-5 5" />, {
  strokeWidth: 1.7,
  round: "both",
  directional: true,
});
export const IconEqual = make("Equal", <path d="M6 10h12M6 14h12" />, { strokeWidth: 2 });

export const icons = {
  search: IconSearch,
  menu: IconMenu,
  close: IconClose,
  sun: IconSun,
  moon: IconMoon,
  bookmark: IconBookmark,
  heart: IconHeart,
  reply: IconReply,
  flag: IconFlag,
  share: IconShare,
  link: IconLink,
  mail: IconMail,
  play: IconPlay,
  check: IconCheck,
  minus: IconMinus,
  alert: IconAlert,
  info: IconInfo,
  arrowUp: IconArrowUp,
  arrowDown: IconArrowDown,
  arrowForward: IconArrowForward,
  equal: IconEqual,
} as const;

export type IconName = keyof typeof icons;
