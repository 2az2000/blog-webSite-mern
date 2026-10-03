import type { Section } from "@/types/content";

/** Verbatim from blog-refrence/assets/nova-data.js (NOVA_SECTIONS). */
export const sections: Record<string, Section> = {
  latest: {
    slug: "latest",
    name: "Latest",
    blurb: "Everything NOVA has published, newest first — reporting, criticism and long-form work across every desk.",
  },
  technology: {
    slug: "technology",
    name: "Technology",
    blurb: "The systems being built, the people building them, and the assumptions they carry. Reporting on software, hardware and the institutions around them.",
  },
  business: {
    slug: "business",
    name: "Business",
    blurb: "Capital, labour and the strange new shapes companies are taking. Written for people who build them, not only for people who fund them.",
  },
  science: {
    slug: "science",
    name: "Science",
    blurb: "Research as it actually happens — slow, contested, and far more interesting than the press release.",
  },
  design: {
    slug: "design",
    name: "Design",
    blurb: "Objects, interfaces and cities, and the decisions that made them what they are.",
  },
  culture: {
    slug: "culture",
    name: "Culture",
    blurb: "How we make meaning now: memory, archives, taste and the platforms that mediate all three.",
  },
  society: {
    slug: "society",
    name: "Society",
    blurb: "Infrastructure, institutions and the public realm — the parts of life nobody markets.",
  },
  innovation: {
    slug: "innovation",
    name: "Innovation",
    blurb: "What is genuinely new, separated from what is merely announced.",
  },
  lifestyle: {
    slug: "lifestyle",
    name: "Lifestyle",
    blurb: "Work, rest and the material texture of the everyday.",
  },
  opinion: {
    slug: "opinion",
    name: "Opinion",
    blurb: "Arguments from NOVA writers and outside contributors. Signed, accountable and open to reply.",
  },
  interviews: {
    slug: "interviews",
    name: "Interviews",
    blurb: "Long conversations with the people doing the work, edited for clarity but not for comfort.",
  },
};
