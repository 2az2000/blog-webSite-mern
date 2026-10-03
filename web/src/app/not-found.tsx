import type { Metadata } from "next";

import { ArticleCard } from "@/components/patterns/article-card";
import { SiteFooter, SkipLink } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SecHead } from "@/components/patterns/sec-head";
import { BigNum, ButtonLink, CardGrid, Cluster, Col, Container, Grid, Heading, Section, Text } from "@/components/primitives";
import { routes } from "@/config/routes";
import { getDictionary, getLocale } from "@/i18n";
import { formatNumber } from "@/lib/format";
import { mostRead } from "@/services/content";

import { ReportLinkButton } from "./_components/report-link-button";

export const metadata: Metadata = { title: "Page not found" };

/** Reference 404.html. Rendered outside the (site) group, so it mounts the chrome itself. */
export default async function NotFound() {
  const locale = await getLocale();
  const t = await getDictionary(locale);
  const suggested = await mostRead(3);

  return (
    <>
      <SkipLink locale={locale} />
      <SiteHeader />
      <main id="main">
        <Section as="header">
          <Container>
            <Grid rowGap={32}>
              <Col span={5}>
                <BigNum size="xl">{formatNumber(404, locale)}</BigNum>
              </Col>
              <Col span={7}>
                <Heading level={1} size="h1">
                  {t.notFound.title}
                </Heading>
                <Text variant="intro" mt={24}>
                  {t.notFound.lead}
                </Text>
                <Cluster gap={12} mt={32}>
                  <ButtonLink href={routes.home()}>{t.notFound.home}</ButtonLink>
                  <ButtonLink href={routes.search()} variant="secondary">
                    {t.notFound.search}
                  </ButtonLink>
                  <ReportLinkButton />
                </Cluster>
              </Col>
            </Grid>
          </Container>
        </Section>

        <Section aria-labelledby="fourohfour-read">
          <Container>
            <SecHead
              index={1}
              id="fourohfour-read"
              locale={locale}
              weight="major"
              title={t.notFound.whileHere}
              link={{ label: t.notFound.allStories, href: routes.category("latest") }}
            />
            <CardGrid cols={3}>
              {suggested.map((a) => (
                <ArticleCard key={a.slug} article={a} locale={locale} />
              ))}
            </CardGrid>
          </Container>
        </Section>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
