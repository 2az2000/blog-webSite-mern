import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/patterns/navigation";
import { routes } from "@/config/routes";
import { getDictionary, getLocale } from "@/i18n";
import { listArticles } from "@/services/content";
import { Container } from "@/components/primitives";

import { SavedReading } from "./saved-reading";

/* Saved — blog-refrence/bookmarks.html */

export const metadata: Metadata = {
  title: "Your reading",
  description: "Saved articles, your reading list, recent history and collections.",
};

export default async function BookmarksPage() {
  const locale = await getLocale();
  const t = await getDictionary(locale);
  const articles = await listArticles();

  return (
    <>
      <Container>
        <Breadcrumbs
          label={t.a11y.breadcrumb}
          items={[
            { label: t.nav.home, href: routes.home() },
            { label: "Account", href: routes.bookmarks() },
            { label: "Saved" },
          ]}
        />
      </Container>
      <SavedReading articles={articles} />
    </>
  );
}
