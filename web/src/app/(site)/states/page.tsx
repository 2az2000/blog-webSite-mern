import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { PageHead } from "@/components/patterns/blocks";
import { EmptyState, Notice, Panel, Skeleton, SkeletonStack } from "@/components/patterns/feedback";
import { Breadcrumbs } from "@/components/patterns/navigation";
import { SecHead } from "@/components/patterns/sec-head";
import {
  BigNum,
  Button,
  ButtonLink,
  CardGrid,
  Cluster,
  Container,
  flex,
  Heading,
  IconBookmark,
  Section,
  Stack,
  Text,
} from "@/components/primitives";
import { routes } from "@/config/routes";
import { getDictionary, getLocale } from "@/i18n";
import { cn } from "@/lib/utils";

import { RetryButton, ToastDemo } from "./states-client";

/* States — blog-refrence/states.html */

export const metadata: Metadata = {
  title: "UI states",
  description: "Error, empty and loading states — every one a real screen with its own copy.",
};

/** .state-cell__label — the overline above each specimen. */
function StateLabel({ children, className = "mb-3" }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("text-overline font-650 tracking-overline text-meta uppercase", className)}>{children}</p>
  );
}

function ErrorPanel({
  label,
  code,
  tone,
  title,
  body,
  actions,
}: {
  label: string;
  code: string;
  tone?: "error" | "warning" | "muted";
  title: string;
  body: string;
  actions: ReactNode;
}) {
  return (
    <div>
      <StateLabel>{label}</StateLabel>
      <Panel>
        <BigNum size="sm" tone={tone}>
          {code}
        </BigNum>
        <Heading level={3} size="h3" mt={16} mb={12}>
          {title}
        </Heading>
        <Text variant="meta" mb={24}>
          {body}
        </Text>
        <Cluster gap={12}>{actions}</Cluster>
      </Panel>
    </div>
  );
}

function LinkButton({ href, children, variant }: { href: string; children: ReactNode; variant?: "secondary" | "ghost" }) {
  return (
    <ButtonLink href={href} size="sm" variant={variant} prefetch={href === "/404" ? false : undefined}>
      {children}
    </ButtonLink>
  );
}

export default async function StatesPage() {
  const locale = await getLocale();
  const t = await getDictionary(locale);

  return (
    <>
      <Container>
        <Breadcrumbs
          label={t.a11y.breadcrumb}
          items={[
            { label: t.nav.home, href: routes.home() },
            { label: "Design system", href: routes.designSystem() },
            { label: "States" },
          ]}
        />
      </Container>

      <PageHead
        eyebrow="Reference screens"
        title="Error, empty and loading states"
        lead="Every state below is a real screen with its own copy. None of them says “something went wrong” — each one names the cause, says what the reader can do, and gives them a way out."
      />

      {/* ERRORS */}
      <Section aria-labelledby="err-title">
        <Container>
          <SecHead index={1} id="err-title" locale={locale} weight="major" title="Error screens" />
          <CardGrid cols={2} gap={48}>
            <ErrorPanel
              label="404 · Page not found"
              code="404"
              title="This page has been unpublished, moved, or never existed"
              body="If you followed a link from inside NOVA, that is our mistake and we would like the referring URL."
              actions={
                <>
                  <LinkButton href="/404">Open the full 404 page</LinkButton>
                  <LinkButton href={routes.search()} variant="secondary">
                    Search instead
                  </LinkButton>
                </>
              }
            />
            <ErrorPanel
              label="500 · Server error"
              code="500"
              tone="error"
              title="Our end, not yours"
              body="Something on our servers failed while building this page. The team has been paged automatically — you do not need to report it. The article itself is fine."
              actions={
                <>
                  <RetryButton>Try again</RetryButton>
                  <LinkButton href={routes.home()} variant="secondary">
                    Back to the homepage
                  </LinkButton>
                </>
              }
            />
            <ErrorPanel
              label="Offline · Network error"
              code="⌁"
              tone="warning"
              title="You appear to be offline"
              body="We could not reach the server. Anything you had already opened is still readable from this device, including saved articles."
              actions={
                <>
                  <RetryButton>Retry now</RetryButton>
                  <LinkButton href={routes.bookmarks()} variant="secondary">
                    Read something saved
                  </LinkButton>
                </>
              }
            />
            <ErrorPanel
              label="451 / regional · Content unavailable"
              code="—"
              tone="muted"
              title="This story is not available in your region"
              body="A legal restriction applies to this piece where you are reading from. We publish the reason and the jurisdiction on our transparency page rather than hiding it."
              actions={
                <>
                  <LinkButton href={routes.about()} variant="secondary">
                    Read why
                  </LinkButton>
                  <LinkButton href={routes.category("latest")} variant="ghost">
                    Browse other stories
                  </LinkButton>
                </>
              }
            />
          </CardGrid>
        </Container>
      </Section>

      {/* EMPTY */}
      <Section aria-labelledby="empty-title">
        <Container>
          <SecHead index={2} id="empty-title" locale={locale} title="Empty states" />
          <Stack flow="flex" gap={48}>
            <div>
              <StateLabel>Search · No results</StateLabel>
              <EmptyState
                mark="?"
                title="Nothing matched “sodium interconnect”"
                actions={
                  <>
                    <ButtonLink href={routes.category("latest")}>Browse the latest</ButtonLink>
                    <ButtonLink href={routes.trending()} variant="secondary">See what’s trending</ButtonLink>
                  </>
                }
              >
                Search covers headlines, standfirsts, authors and tags. Try a broader word, check the spelling, or start
                from a section instead.
              </EmptyState>
            </div>
            <div>
              <StateLabel>Bookmarks · Nothing saved</StateLabel>
              <EmptyState
                mark={<IconBookmark />}
                title="Nothing saved yet"
                actions={
                  <ButtonLink href={routes.category("latest")}>Browse the latest</ButtonLink>
                }
              >
                Tap the bookmark on any story and it lands here. Saved articles sync across your devices and stay in the
                account even if your subscription lapses.
              </EmptyState>
            </div>
            <div>
              <StateLabel>Comments · None yet</StateLabel>
              <EmptyState
                mark="“”"
                title="No comments yet"
                actions={
                  <Button asChild>
                    <Link href={`${routes.article("context-software")}#comments`}>Open a story and write one</Link>
                  </Button>
                }
              >
                Be the first to respond. Corrections, first-hand experience and pointed disagreement are all welcome; the
                reporter reads every thread.
              </EmptyState>
            </div>
          </Stack>
        </Container>
      </Section>

      {/* SKELETONS */}
      <Section aria-labelledby="skel-title">
        <Container>
          <SecHead
            index={3}
            id="skel-title"
            locale={locale}
            title="Loading skeletons"
            link={{ label: "Shaped like the layout they replace" }}
          />
          <StateLabel className="mb-4">Card grid · latest stories</StateLabel>
          <CardGrid cols={3}>
            {[0, 1, 2].map((i) => (
              <SkeletonStack key={i}>
                <Skeleton shape="media" />
                <Skeleton length="short" />
                <Skeleton shape="title" />
                <Skeleton />
                <Skeleton length="mid" />
              </SkeletonStack>
            ))}
          </CardGrid>

          <StateLabel className="mt-12 mb-4">Article page · headline, byline and body</StateLabel>
          <Panel>
            <SkeletonStack className="max-w-measure-wide gap-4">
              <Skeleton length="short" />
              <Skeleton shape="display" />
              <Skeleton shape="display" length="short" />
              <Skeleton length="mid" />
              <Skeleton shape="media" className="mt-4 mb-4" />
              <Skeleton />
              <Skeleton />
              <Skeleton length="mid" />
              <Skeleton />
              <Skeleton length="short" />
            </SkeletonStack>
          </Panel>

          <StateLabel className="mt-12 mb-4">Compact list · trending rail</StateLabel>
          <Stack flow="flex" gap={24} className="max-w-rail">
            {[0, 1].map((i) => (
              <Cluster key={i} gap={16} align="start" wrap={false}>
                <Skeleton shape="thumb" className={flex.fixed} />
                <SkeletonStack className={flex.fill}>
                  <Skeleton length="short" />
                  <Skeleton />
                  <Skeleton length="mid" />
                </SkeletonStack>
              </Cluster>
            ))}
          </Stack>
        </Container>
      </Section>

      {/* FEEDBACK */}
      <Section aria-labelledby="feedback-title">
        <Container>
          <SecHead index={4} id="feedback-title" locale={locale} title="Inline feedback" />
          <Stack flow="flex" gap={16} className="max-w-head">
            <Notice tone="success">
              <strong className="text-fg">Saved.</strong> The story is in your reading list and available offline on this
              device.
            </Notice>
            <Notice tone="warning">
              <strong className="text-fg">You have one free article left this month.</strong> Reading stays free after that
              on the homepage and the Dispatch.
            </Notice>
            <Notice tone="error">
              <strong className="text-fg">Comment not posted.</strong> The connection dropped mid-send. Your text is still in
              the box — press post again.
            </Notice>
            <Notice>
              <strong className="text-fg">This article was updated</strong> on 13 September. The changes are listed at the
              foot of the piece.
            </Notice>
          </Stack>
          <Cluster gap={12} mt={32}>
            <ToastDemo />
            <Button variant="secondary" loading aria-label="Loading example">
              Loading
            </Button>
            <Button disabled>Disabled</Button>
          </Cluster>
        </Container>
      </Section>
    </>
  );
}
