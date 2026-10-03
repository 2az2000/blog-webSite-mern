import type { Dictionary } from "@/i18n/dictionaries";

import { routes } from "./routes";

export type NavKey = keyof Dictionary["nav"];

export type NavItem = { key: NavKey; href: string };

/** Primary sections, in masthead order (reference nova.js NAV). */
export const primaryNav: NavItem[] = [
  { key: "home", href: routes.home() },
  { key: "latest", href: routes.category("latest") },
  { key: "technology", href: routes.category("technology") },
  { key: "business", href: routes.category("business") },
  { key: "science", href: routes.category("science") },
  { key: "design", href: routes.category("design") },
  { key: "culture", href: routes.category("culture") },
  { key: "opinion", href: routes.category("opinion") },
];

type FooterLinkKey = keyof Dictionary["footer"]["links"];

export type FooterColumn = {
  title: Exclude<keyof Dictionary["footer"], "links">;
  links: { label: { nav: NavKey } | { footer: FooterLinkKey }; href: string }[];
};

/** Footer columns (reference nova.js renderFooter). */
export const footerColumns: FooterColumn[] = [
  {
    title: "sections",
    links: primaryNav.filter((n) => n.key !== "home").map((n) => ({ label: { nav: n.key }, href: n.href })),
  },
  {
    title: "discover",
    links: [
      { label: { footer: "trending" }, href: routes.trending() },
      { label: { footer: "topics" }, href: routes.topic("artificial-intelligence") },
      { label: { footer: "longReads" }, href: routes.longform("grid-rebuild") },
      { label: { footer: "interviews" }, href: routes.category("interviews") },
      { label: { footer: "search" }, href: routes.search() },
      { label: { footer: "designSystem" }, href: routes.designSystem() },
    ],
  },
  {
    title: "account",
    links: [
      { label: { footer: "signIn" }, href: routes.signIn() },
      { label: { footer: "createAccount" }, href: routes.signUp() },
      { label: { footer: "saved" }, href: routes.bookmarks() },
      { label: { footer: "newsletters" }, href: routes.newsletter() },
      { label: { footer: "subscribe" }, href: routes.subscribe() },
      { label: { footer: "uiStates" }, href: routes.states() },
    ],
  },
  {
    title: "publication",
    links: [
      { label: { footer: "about" }, href: routes.about() },
      { label: { footer: "standards" }, href: routes.about() },
      { label: { footer: "contact" }, href: routes.about() },
      { label: { footer: "privacy" }, href: routes.about() },
      { label: { footer: "terms" }, href: routes.about() },
      { label: { footer: "notFound" }, href: "/404" },
    ],
  },
];

export const legalLinks: { key: FooterLinkKey; href: string }[] = [
  { key: "privacy", href: routes.about() },
  { key: "terms", href: routes.about() },
  { key: "cookies", href: routes.about() },
  { key: "accessibility", href: routes.about() },
];
