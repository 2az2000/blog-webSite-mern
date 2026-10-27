import type { Metadata } from "next";

import { LegalDocument } from "@/components/patterns/legal-document";
import { routes } from "@/config/routes";
import { legalDocs } from "@/content/legal";
import { getLocale } from "@/i18n";

/* Privacy — no reference screen; plain prose set with the site's own type. The words are in content/legal.ts. */

export async function generateMetadata(): Promise<Metadata> {
  const doc = legalDocs[await getLocale()].privacy;
  return { title: doc.title, description: doc.description, alternates: { canonical: routes.privacy() } };
}

export default function PrivacyPage() {
  return <LegalDocument docKey="privacy" />;
}
