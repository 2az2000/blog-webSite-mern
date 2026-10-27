import type { Metadata } from "next";

import { LegalDocument } from "@/components/patterns/legal-document";
import { routes } from "@/config/routes";
import { legalDocs } from "@/content/legal";
import { getLocale } from "@/i18n";

/* Terms — no reference screen; plain prose set with the site's own type. The words are in content/legal.ts. */

export async function generateMetadata(): Promise<Metadata> {
  const doc = legalDocs[await getLocale()].terms;
  return { title: doc.title, description: doc.description, alternates: { canonical: routes.terms() } };
}

export default function TermsPage() {
  return <LegalDocument docKey="terms" />;
}
