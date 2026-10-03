"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { ArticleCard } from "@/components/patterns/article-card";
import { CollectionTile, PageHead } from "@/components/patterns/blocks";
import { EmptyState } from "@/components/patterns/feedback";
import { SortMenu } from "@/components/patterns/sort-menu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { notify } from "@/components/ui/sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button, ButtonLink, CardGrid, Cluster, Container, flex, IconBookmark, refLink, Section, Stack, Text } from "@/components/primitives";
import { routes } from "@/config/routes";
import { useI18n } from "@/i18n/i18n-provider";
import { formatNumber } from "@/lib/format";
import { useBookmarks } from "@/stores/bookmarks-store";
import type { ArticleView } from "@/types/content";

/*
 * The reading screen (reference bookmarks.html script).
 * "Saved" is the real bookmarks store. Reading list, history and collections
 * are the reference's sample data held in page state until accounts exist.
 */

type View = "saved" | "list" | "recent" | "collections";
type Sort = "saved" | "short" | "long";
type Collection = { name: string; slugs: string[] };

const EMPTY: Record<View, { mark: ReactNode; title: string; body: string; cta: [string, string] }> = {
  saved: {
    mark: <IconBookmark />,
    title: "Nothing saved yet",
    body: "Tap the bookmark on any story and it lands here. Saved articles sync across your devices and stay in the account even if your subscription lapses.",
    cta: ["Browse the latest", routes.category("latest")],
  },
  list: {
    mark: "≡",
    title: "Your reading list is empty",
    body: "The reading list is for the long ones — pieces you want to sit down with rather than skim. Add a story from its page or from anything you have saved.",
    cta: ["Find a long read", routes.longform("grid-rebuild")],
  },
  recent: {
    mark: "↺",
    title: "No reading history on this device",
    body: "Stories you open appear here for thirty days. History is stored on your device only and never leaves it.",
    cta: ["Start reading", routes.home()],
  },
  collections: {
    mark: "+",
    title: "No collections yet",
    body: "Collections group saved stories by whatever makes sense to you — a project, a pitch, a class. Make the first one and drag saved articles into it.",
    cta: ["Create a collection", "#"],
  },
};

export function SavedReading({ articles }: { articles: ArticleView[] }) {
  const { t, locale } = useI18n();
  const toast = (msg: string, kind: "success" | "error" = "success") => notify(msg, kind, { dismissLabel: t.a11y.dismiss });

  const saved = useBookmarks((s) => s.slugs);
  const removeSaved = useBookmarks((s) => s.remove);
  const clearSaved = useBookmarks((s) => s.clear);
  const [list, setList] = useState(["ai-labour", "ocean-floor"]);
  const [recent, setRecent] = useState(["context-software", "think-better", "public-transit", "battery-chemistry"]);
  const [collections, setCollections] = useState<Collection[]>([
    { name: "Infrastructure reading", slugs: ["grid-rebuild", "city-night", "battery-chemistry"] },
    { name: "For the design review", slugs: ["interfaces-standing-still", "type-revival", "public-transit"] },
    { name: "Unsorted", slugs: [] },
  ]);
  const [view, setView] = useState<View>("saved");
  const [sort, setSort] = useState<Sort>("saved");

  const bySlug = new Map(articles.map((a) => [a.slug, a]));
  const resolve = (slugs: string[]) => {
    const found = slugs.flatMap((s) => bySlug.get(s) ?? []);
    if (sort === "short") found.sort((a, b) => a.mins - b.mins);
    if (sort === "long") found.sort((a, b) => b.mins - a.mins);
    return found;
  };
  const buckets = { saved, list, recent };
  const counts: Record<View, number> = {
    saved: saved.length,
    list: list.length,
    recent: recent.length,
    collections: collections.length,
  };

  const remove = (bucket: Exclude<View, "collections">, slug: string) => {
    if (bucket === "saved") removeSaved(slug);
    if (bucket === "list") setList((l) => l.filter((s) => s !== slug));
    if (bucket === "recent") setRecent((l) => l.filter((s) => s !== slug));
    toast(`Removed from ${bucket === "list" ? "your reading list" : bucket === "recent" ? "history" : "saved articles"}`);
  };

  const shown = view === "collections" ? [] : resolve(buckets[view]);
  const minutes = shown.reduce((sum, a) => sum + a.mins, 0);
  const status =
    view === "collections"
      ? `${counts.collections} collections`
      : shown.length
        ? `${shown.length} stories · ${minutes} minutes of reading`
        : "";

  const empty = (key: View) => {
    const e = EMPTY[key];
    return (
      <EmptyState
        mark={e.mark}
        title={e.title}
        headingLevel={2}
        actions={
          <ButtonLink href={e.cta[1]}>{e.cta[0]}</ButtonLink>
        }
      >
        {e.body}
      </EmptyState>
    );
  };

  return (
    <>
      <PageHead
        leadGap={16}
        eyebrow="Signed in as You · Subscriber"
        title="Your reading"
        lead="Everything you saved, in the order you saved it. Saved articles stay in your account whether or not your subscription is active."
        actions={
          <>
            <Button variant="secondary" onClick={() => toast("Your list would download as a file")}>
              Export list
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="danger">Clear all saved</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogTitle>Clear everything you have saved?</DialogTitle>
                <DialogDescription>
                  This removes all saved articles and your reading list from this account. Collections and their names
                  are removed too. It cannot be undone.
                </DialogDescription>
                <DialogFooter className="mt-0 gap-3">
                  <DialogClose asChild>
                    <Button variant="secondary">Keep them</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button
                      variant="danger"
                      onClick={() => {
                        clearSaved();
                        setList([]);
                        setCollections([]);
                        toast("All saved articles cleared", "error");
                      }}
                    >
                      Yes, clear all saved
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <Section tight>
        <Container>
          <Tabs value={view} onValueChange={(v) => setView(v as View)}>
            <TabsList aria-label="Saved views">
              <TabsTrigger value="saved">Saved articles ({formatNumber(counts.saved, locale)})</TabsTrigger>
              <TabsTrigger value="list">Reading list ({formatNumber(counts.list, locale)})</TabsTrigger>
              <TabsTrigger value="recent">Recently viewed ({formatNumber(counts.recent, locale)})</TabsTrigger>
              <TabsTrigger value="collections">Collections ({formatNumber(counts.collections, locale)})</TabsTrigger>
            </TabsList>
          </Tabs>
        </Container>
      </Section>

      <Section aria-live="polite">
        <Container>
          <Cluster gap={16} justify="between" wrap={false} mb={24}>
            <Text variant="meta" className={flex.fill}>
              {status}
            </Text>
            {view !== "collections" && (
              <SortMenu
                className={flex.fixed}
                label="Sort"
                menuLabel="Sort saved articles"
                value={sort}
                onChange={setSort}
                options={[
                  { key: "saved", label: "Recently saved" },
                  { key: "short", label: "Shortest first" },
                  { key: "long", label: "Longest first" },
                ]}
              />
            )}
          </Cluster>

          {view === "collections" ? (
            collections.length ? (
              <CardGrid cols={3} gap={24}>
                {collections.map((c, i) => (
                  <CollectionTile
                    key={`${c.name}-${i}`}
                    eyebrow="Collection"
                    title={c.name}
                    size="h3"
                    lines={[{ text: t.card.stories(formatNumber(c.slugs.length, locale)), nowrap: true }]}
                  >
                    {c.slugs.length ? (
                      <Stack as="ul" gap={8} mt={8}>
                        {c.slugs.flatMap((s) => {
                          const a = bySlug.get(s);
                          return a ? (
                            <li key={s}>
                              <Text as="span" variant="meta" className="block max-w-full truncate">
                                <Link href={a.href} className={refLink.link}>
                                  {a.title}
                                </Link>
                              </Text>
                            </li>
                          ) : [];
                        })}
                      </Stack>
                    ) : (
                      <Text variant="meta">Empty — drag a saved story here.</Text>
                    )}
                  </CollectionTile>
                ))}
                <CollectionTile
                  eyebrow="New"
                  title="Create a collection"
                  size="h3"
                  lines={[{ text: "Group saved stories by project, pitch or class." }]}
                  onClick={() => {
                    setCollections((cs) => [...cs, { name: "New collection", slugs: [] }]);
                    toast("Collection created");
                  }}
                />
              </CardGrid>
            ) : (
              empty("collections")
            )
          ) : shown.length ? (
            shown.map((a) => (
              <Cluster key={a.slug} gap={24} align="start" wrap={false} className="border-t border-border py-6">
                <div className={flex.fill}>
                  <ArticleCard article={a} variant="horizontal" locale={locale} headingLevel={2} />
                </div>
                <Stack flow="flex" gap={8} className={flex.fixed}>
                  <Button variant="ghost" size="sm" onClick={() => remove(view, a.slug)}>
                    Remove
                  </Button>
                  {view === "saved" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setList((l) => (l.includes(a.slug) ? l : [a.slug, ...l]));
                        toast("Added to your reading list");
                      }}
                    >
                      Add to list
                    </Button>
                  )}
                </Stack>
              </Cluster>
            ))
          ) : (
            empty(view)
          )}
        </Container>
      </Section>
    </>
  );
}
