import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/patterns/navigation";
import { routes } from "@/config/routes";
import { getDictionary, getLocale } from "@/i18n";
import { searchContent } from "@/services/content";
import { Container } from "@/components/primitives";

import { SearchScreen } from "./search-screen";

/* Search — blog-refrence/search.html */

export async function generateMetadata({ searchParams }: PageProps<"/search">): Promise<Metadata> {
  const q = (await searchParams).q;
  return {
    title: "Search",
    description: "Search NOVA stories, authors and topics.",
    // a page of results for someone's query is not content worth a place in a search engine
    ...(typeof q === "string" && q.trim() ? { robots: { index: false, follow: true } } : { alternates: { canonical: routes.search() } }),
  };
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const q = (await searchParams).q;
  const locale = await getLocale();
  const t = await getDictionary(locale);
  const query = typeof q === "string" ? q.trim() : "";
  // arriving with ?q= shows its results in the first paint; later searches are fetched by the screen
  const initial = query ? await searchContent(query) : null;

  return (
    <>
      <Container>
        <Breadcrumbs label={t.a11y.breadcrumb} items={[{ label: t.nav.home, href: routes.home() }, { label: "Search" }]} />
      </Container>
      <SearchScreen initial={initial} initialQuery={typeof q === "string" ? q : ""} />
    </>
  );
}
