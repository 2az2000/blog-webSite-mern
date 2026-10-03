"use client";

import { useState, type ReactNode } from "react";

import { ArticleCard } from "@/components/patterns/article-card";
import { EmptyState } from "@/components/patterns/feedback";
import { Pagination } from "@/components/patterns/navigation";
import { SecHead } from "@/components/patterns/sec-head";
import { SortMenu } from "@/components/patterns/sort-menu";
import { notify } from "@/components/ui/sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button, ButtonLink, CardGrid, Cluster, Col, Container, flex, Grid, Section } from "@/components/primitives";
import { routes } from "@/config/routes";
import { useI18n } from "@/i18n/i18n-provider";
import type { ArticleView } from "@/types/content";

type Order = "latest" | "popular" | "discussed";
type Period = "all" | "month" | "week";

/**
 * Filters, featured story and the paged grid (reference category.html script).
 * One client island because the tabs, the result count and the grid share state.
 */
export function CategoryBrowser({ pool, aside }: { pool: ArticleView[]; aside: ReactNode }) {
  const { t, locale } = useI18n();
  const [order, setOrder] = useState<Order>("latest");
  const [period, setPeriod] = useState<Period>("all");
  const [shown, setShown] = useState(4);
  const [loading, setLoading] = useState(false);

  const [featured, ...rest] = pool;
  const sorted =
    order === "popular"
      ? [...rest].sort((a, b) => b.views - a.views)
      : order === "discussed"
        ? [...rest].sort((a, b) => b.comments - a.comments)
        : rest;
  const list = sorted.slice(0, shown);

  return (
    <>
      {/* FILTERS */}
      <Section tight aria-labelledby="filter-label">
        <Container>
          <h2 className="sr-only" id="filter-label">
            Filter and sort this section
          </h2>
          <Cluster gap={24} justify="between" wrap={false}>
            <Tabs
              className={flex.fill}
              value={order}
              onValueChange={(v) => {
                setOrder(v as Order);
                setShown(4);
              }}
            >
              <TabsList aria-label="Article filters">
                <TabsTrigger value="latest">Latest</TabsTrigger>
                <TabsTrigger value="popular">Popular</TabsTrigger>
                <TabsTrigger value="discussed">Most discussed</TabsTrigger>
              </TabsList>
            </Tabs>
            <SortMenu
              className={flex.fixed}
              variant="secondary"
              label="Period"
              menuLabel="Time period"
              value={period}
              onChange={(p) => {
                setPeriod(p);
                notify("Period filter applied", "success", { dismissLabel: t.a11y.dismiss });
              }}
              options={[
                { key: "all", label: "All time" },
                { key: "month", label: "This month" },
                { key: "week", label: "This week" },
              ]}
            />
          </Cluster>
        </Container>
      </Section>

      {/* FEATURED */}
      {featured && (
        <Section tight aria-labelledby="featured-title">
          <Container>
            <SecHead index={1} id="featured-title" locale={locale} weight="major" title="Featured" />
            <ArticleCard article={featured} variant="featured" locale={locale} eager />
          </Container>
        </Section>
      )}

      {/* LIST + RAILS */}
      <Section aria-labelledby="list-title">
        <Grid  container rowGap={64}>
          <Col span={8}>
            <SecHead
              index={2}
              id="list-title"
              locale={locale}
              title="Latest in this section"
              link={featured ? { label: `Showing ${list.length} of ${rest.length}` } : undefined}
            />
            {featured ? (
              <>
                <CardGrid cols={2}>
                  {list.map((a) => (
                    <ArticleCard key={a.slug} article={a} locale={locale} />
                  ))}
                </CardGrid>
                <Pagination current={1} total={12} locale={locale} hrefFor={(p) => `?page=${p}`} />
                {/* The reference sets [hidden] on this button, but .btn's display wins, so it always shows. */}
                                  <Cluster justify="center" mb={32}>
                    <Button
                      variant="secondary"
                      loading={loading}
                      onClick={() => {
                        setLoading(true);
                        setTimeout(() => {
                          setShown((n) => n + 4);
                          setLoading(false);
                        }, 600);
                      }}
                    >
                      Load more
                    </Button>
                  </Cluster>
              </>
            ) : (
              <EmptyState
                title="Nothing published here yet"
                actions={
                  <>
                    <ButtonLink href={routes.newsletter()}>Follow this section</ButtonLink>
                    <ButtonLink href={routes.category("latest")} variant="secondary">Browse everything</ButtonLink>
                  </>
                }
              >
                This desk is new. Follow it and we will email you the moment the first story runs, or browse the
                sections that are already going.
              </EmptyState>
            )}
          </Col>
          <Col span={4} as="aside" className="grid content-start gap-16">
            {aside}
          </Col>
        </Grid>
      </Section>
    </>
  );
}
