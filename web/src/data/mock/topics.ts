import type { Topic } from "@/types/content";

/** Verbatim from blog-refrence/assets/nova-data.js (NOVA_TOPICS). */
export const topics: Record<string, Topic> = {
  "artificial-intelligence": {
    slug: "artificial-intelligence",
    name: "Artificial Intelligence",
    blurb: "NOVA's continuing coverage of machine learning systems in production: what they change about work, what they cost to run, and who is accountable when they fail.",
    related: ["software", "labour", "ethics", "research"],
  },
  "archives": {
    slug: "archives",
    name: "Archives",
    blurb: "Keeping the record, and who pays to keep it.",
    related: ["memory", "internet", "culture"],
  },
  "climate": {
    slug: "climate",
    name: "Climate",
    blurb: "Measurement, adaptation and infrastructure under a changing baseline.",
    related: ["energy", "cities", "oceans"],
  },
  "design-systems": {
    slug: "design-systems",
    name: "Design Systems",
    blurb: "The shared vocabularies teams build so products stay coherent.",
    related: ["interface", "craft", "typography"],
  },
  "work": {
    slug: "work",
    name: "Work",
    blurb: "How jobs are changing, from the inside.",
    related: ["labour", "management", "attention"],
  },
};
