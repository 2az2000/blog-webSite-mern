import type { Metadata } from "next";

import { PageHead } from "@/components/patterns/blocks";
import { Breadcrumbs } from "@/components/patterns/navigation";
import { Code, Container, Text } from "@/components/primitives";
import { routes } from "@/config/routes";
import { getDictionary, getLocale } from "@/i18n";

import { ComponentsDemo } from "./_sections/components-demo";
import { EditorialSections } from "./_sections/editorial";
import { FoundationsSections } from "./_sections/foundations";
import { StatesUtilitiesSections } from "./_sections/states-utilities";

export const metadata: Metadata = {
  title: "The NOVA design system",
  description:
    "Foundations, editorial signatures, components and states as they are actually implemented in assets/nova.css and assets/nova.js.",
};

/**
 * Living style guide — blog-refrence/design-system.html.
 * It documents the reference stylesheet, so its copy is the reference copy.
 */
export default async function DesignSystemPage() {
  const locale = await getLocale();
  const t = await getDictionary(locale);

  return (
    <>
      <Container>
        <Breadcrumbs
          label={t.a11y.breadcrumb}
          items={[{ label: t.nav.home, href: routes.home() }, { label: "Design system" }]}
        />
      </Container>

      <PageHead
        kicker={
          <Text variant="index" tone="accent" mb={16}>
            Version 2 · Phase 2 refinement
          </Text>
        }
        title="The NOVA design system"
        lead={
          <>
            Everything on this page is read from the same two files every screen uses — <Code>assets/nova.css</Code> and{" "}
            <Code>assets/nova.js</Code>. Nothing here is a mock-up of an intention: if a token, signature or state is
            documented below, it is the one the product ships.
          </>
        }
      >
        <Text variant="meta" mt={24} measure="long">
          Phase 2 retired four Phase 1 components — <Code>.section-head</Code>, <Code>.figure-full</Code>/
          <Code>.figcaption</Code> and <Code>.rank-board</Code>/<Code>.rank-row</Code> — and replaced the values they
          carried inline with the named utility layer in section 21 of the stylesheet. No page in this prototype carries
          a <Code>style</Code> attribute except for chart data values, where the number belongs in the markup.
        </Text>
      </PageHead>

      <FoundationsSections locale={locale} />
      <EditorialSections locale={locale} />
      <ComponentsDemo />
      <StatesUtilitiesSections locale={locale} />
    </>
  );
}
