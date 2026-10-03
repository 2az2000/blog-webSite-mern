import type { Author } from "@/types/content";

/*
 * Verbatim from blog-refrence/assets/nova-data.js (NOVA_AUTHORS), merged with
 * the AUTHOR_EXTRA block of blog-refrence/author.html (bio, since, portrait).
 */
export const authors: Record<string, Author> = {
  duarte: {
    slug: "duarte", name: "Elena Duarte", initials: "ED", role: "Senior Technology Correspondent",
    since: 2021,
    bio: "Elena has covered software infrastructure for eleven years, previously at two trade publications and one that folded. She writes about the parts of the industry that do not photograph well: procurement, maintenance, and the long tail of systems nobody wants to own.",
    portrait: "/images/author-duarte.jpg",
  },
  feldt: {
    slug: "feldt", name: "Marcus Feldt", initials: "MF", role: "Business Editor",
    since: 2022,
    bio: "Marcus edits the Business desk. Before NOVA he spent a decade covering mid-market companies — the ones too large to be scrappy and too small to be news — and he still thinks that is where the interesting decisions get made.",
  },
  raghu: {
    slug: "raghu", name: "Priya Raghunathan", initials: "PR", role: "Science Editor",
    since: 2021,
    bio: "Priya trained as a molecular biologist and has been explaining other people's experiments ever since. She is interested in methods, replication, and the long unfashionable middle of a research programme.",
  },
  okonkwo: {
    slug: "okonkwo", name: "Tomás Okonkwo", initials: "TO", role: "Design Critic",
    since: 2023,
    bio: "Tomás writes criticism about objects and interfaces. He is unusually forgiving of ugly things that work and unusually harsh about beautiful things that do not.",
  },
  vo: {
    slug: "vo", name: "Hannah Vo", initials: "HV", role: "Culture Writer",
    since: 2022,
    bio: "Hannah covers culture with a bias toward institutions: archives, libraries, catalogues, and the people who maintain them long after the funding cycle has moved on.",
  },
  ashworth: {
    slug: "ashworth", name: "Daniel Ashworth", initials: "DA", role: "Contributing Editor, Opinion",
    since: 2021,
    bio: "Daniel writes the opinion column and edits outside contributors. He argues in public and changes his mind in public, which he regards as the same job.",
  },
  lindqvist: {
    slug: "lindqvist", name: "Sofia Lindqvist", initials: "SL", role: "Investigations",
    since: 2020,
    bio: "Sofia reports on infrastructure and the institutions that fund it. Her work relies on access requests, night shifts, and a stubborn interest in maintenance budgets.",
  },
  haddad: {
    slug: "haddad", name: "Noor Haddad", initials: "NH", role: "Innovation Reporter",
    since: 2024,
    bio: "Noor covers innovation with a working definition borrowed from a materials scientist: new means it survived contact with a factory.",
  },
};

/** nova.js author() fallback. */
export const fallbackAuthor: Author = {
  slug: "staff",
  name: "NOVA Staff",
  initials: "NV",
  role: "Newsroom",
  since: 2023,
  bio: "Biography to follow.",
};
