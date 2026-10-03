import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CommentsSection, MobileArticleBar } from "@/components/patterns/article-client";
import { ArticleCard } from "@/components/patterns/article-card";
import { ArticleBody, ArticleHead, ArticleMeta, AuthorBio, Byline, TagRow } from "@/components/patterns/article-parts";
import { ActiveNav } from "@/components/layout/active-nav";
import { BookmarkButton, ShareBar } from "@/components/patterns/actions";
import { Notice } from "@/components/patterns/feedback";
import { Frame } from "@/components/patterns/frame";
import { Breadcrumbs } from "@/components/patterns/navigation";
import { NewsletterBand } from "@/components/patterns/newsletter-band";
import { ReadingProgress } from "@/components/patterns/reading-progress";
import { SecHead } from "@/components/patterns/sec-head";
import { BadgeLink, Button, CardGrid, CardList, Container, Section, Text } from "@/components/primitives";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { routes } from "@/config/routes";
import { getDictionary, getLocale } from "@/i18n";
import { getArticlePage, getComments, listArticleSlugs } from "@/services/content";

/* Article — blog-refrence/article.html */

export async function generateStaticParams() {
  return (await listArticleSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/article/[slug]">): Promise<Metadata> {
  const data = await getArticlePage((await params).slug);
  if (!data) return {};
  const { article: a } = data;
  return {
    title: a.title,
    description: a.standfirst,
    openGraph: { title: a.title, description: a.standfirst, images: [a.image], type: "article" },
  };
}

/** Reference crumb: long titles are cut at 44 characters. */
const crumb = (title: string) => (title.length > 46 ? `${title.slice(0, 44)}…` : title);

export default async function ArticlePage({ params }: PageProps<"/article/[slug]">) {
  const data = await getArticlePage((await params).slug);
  if (!data) notFound();
  const locale = await getLocale();
  const t = await getDictionary(locale);
  const { article: a, detail, body, tags, related, moreByAuthor } = data;
  const author = a.authorRef;
  const comments = await getComments();

  return (
    <>
      <ActiveNav section={a.section} />
      <ReadingProgress targetId="article" />

      <article id="article">
        <Container>
          <Breadcrumbs
            label={t.a11y.breadcrumb}
            items={[
              { label: t.nav.home, href: routes.home() },
              { label: a.sectionRef.name, href: routes.category(a.section) },
              { label: crumb(a.title) },
            ]}
          />
        </Container>

        {/* HEAD */}
        <ArticleHead
          kicker={
            <>
              <BadgeLink href={routes.category(a.section)}>{a.sectionRef.name}</BadgeLink>
              <Text as="span" variant="index" tone="muted">
                {detail.label}
              </Text>
            </>
          }
          title={a.title}
          standfirst={a.standfirst}
          byline={
            <>
              <Byline author={author} locale={locale} />
              <ArticleMeta date={a.date} updated={detail.updated} mins={a.mins} locale={locale} />
              <ShareBar title={a.title}>
                <BookmarkButton slug={a.slug} label={a.title} />
              </ShareBar>
            </>
          }
        />

        {/* HERO IMAGE */}
        <Container>
          <Frame
            src={a.image}
            alt={detail.heroAlt}
            ratio="16x9"
            eager
            sizes="(max-width: 1280px) 100vw, 1280px"
            caption={detail.heroCaption}
            credit={detail.heroCredit}
          />
        </Container>

        {/* BODY */}
        <Container>
          <ArticleBody blocks={body} locale={locale} dropcap={detail.dropcap} />
        </Container>

        {/* AUTHOR BIO + TAGS */}
        <Container narrow>
          <AuthorBio
            author={author}
            locale={locale}
            label={t.article.writtenBy}
            actions={
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {t.article.contactSecurely}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogTitle>Contact this reporter</DialogTitle>
                  <DialogDescription className="mt-4">
                    For confidential material, use the newsroom&apos;s encrypted drop rather than email. Do not use a work
                    device or a work network.
                  </DialogDescription>
                  <Notice tone="warning" bareIcon>
                    This prototype does not transmit anything. The real drop would be published at a separate, hardened
                    domain.
                  </Notice>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="secondary">{t.a11y.close}</Button>
                    </DialogClose>
                    <DialogClose asChild>
                      <Button>Open secure drop</Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            }
          />
          <TagRow id="tags-title" locale={locale} tags={tags.map((tag) => ({ label: tag.name, topic: tag.slug }))} />
        </Container>

        {/* RELATED */}
        <Section aria-labelledby="related-title">
          <Container>
            <SecHead
              index={1}
              id="related-title"
              locale={locale}
              weight="major"
              title="Related stories"
              link={{ label: "More from this section", href: routes.category(a.section) }}
            />
            <CardGrid>
              {related.map((r) => (
                <ArticleCard key={r.slug} article={r} locale={locale} />
              ))}
            </CardGrid>
          </Container>
        </Section>

        {/* MORE FROM THE AUTHOR */}
        <Section aria-labelledby="more-author-title">
          <Container>
            <SecHead
              index={2}
              id="more-author-title"
              locale={locale}
              weight="quiet"
              title={`More from ${author.name}`}
              link={{ label: "Author archive", href: routes.author(author.slug) }}
            />
            {moreByAuthor.length ? (
              <CardList gap={24}>
                {moreByAuthor.map((m) => (
                  <ArticleCard key={m.slug} article={m} variant="minimal" locale={locale} />
                ))}
              </CardList>
            ) : (
              <Text variant="meta">This is the author’s first piece for NOVA.</Text>
            )}
          </Container>
        </Section>
      </article>

      {/* NEWSLETTER */}
      <NewsletterBand
        id="anl-title"
        eyebrow="Keep reading NOVA"
        title="The reporting behind the headline, twice a week"
        lead="Stories like this one, plus what our editors read elsewhere. Free."
        form={{ footnote: "Unsubscribe in one click from any issue." }}
      />

      {/* COMMENTS */}
      <Section id="comments" aria-labelledby="comments-title">
        <Container narrow>
          <CommentsSection comments={comments} index={3} />
        </Container>
      </Section>

      <MobileArticleBar cta={t.article.joinDiscussion} href="#comments" slug={a.slug} saveLabel={t.article.thisArticle} />
    </>
  );
}
