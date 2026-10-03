import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/patterns/navigation";
import { routes } from "@/config/routes";
import { getDictionary, getLocale } from "@/i18n";
import { getSearchIndex } from "@/services/content";
import { Container } from "@/components/primitives";

import { SearchScreen } from "./search-screen";

/* Search — blog-refrence/search.html */

export const metadata: Metadata = {
  title: "Search",
  description: "Search NOVA stories, authors and topics.",
};

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const q = (await searchParams).q;
  const locale = await getLocale();
  const t = await getDictionary(locale);
  const index = await getSearchIndex();

  return (
    <>
      <Container>
        <Breadcrumbs label={t.a11y.breadcrumb} items={[{ label: t.nav.home, href: routes.home() }, { label: "Search" }]} />
      </Container>
      <SearchScreen index={index} initialQuery={typeof q === "string" ? q : ""} />
    </>
  );
}
