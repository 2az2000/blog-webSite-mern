"use client";

import { Component, type ReactNode } from "react";

import { Notice } from "@/components/patterns/feedback";
import { ArticleBody, ArticleHead, ArticleMeta, Byline } from "@/components/patterns/article-parts";
import { Frame } from "@/components/patterns/frame";
import { Badge, Container, Text } from "@/components/primitives";
import { useI18n } from "@/i18n/i18n-provider";
import type { Author, BodyBlock, ResolvedBlock } from "@/types/content";

/*
 * The live preview: the same ArticleHead, Frame and ArticleBody the public
 * article page draws, fed from the editor's unsaved state. What an editor
 * sees here is what readers will see, because there is no second renderer.
 */

export type PreviewData = {
  title: string;
  standfirst: string;
  sectionName: string;
  mins: number;
  /** ISO calendar day shown as the publication date. */
  date: string;
  image: string;
  detail: Record<string, unknown>;
  blocks: BodyBlock[];
  author: Author;
};

const usable = (src: unknown): src is string => typeof src === "string" && /^(\/|https?:\/\/)\S+/.test(src);

/** A block still being typed (no image yet) is skipped rather than allowed to crash the page. */
function drawable(blocks: BodyBlock[]): ResolvedBlock[] {
  return blocks.flatMap((b): ResolvedBlock[] => {
    if ((b.type === "figure" || b.type === "break") && (!usable(b.src) || !(b.width > 0) || !(b.height > 0))) return [];
    if (b.type === "chart" && b.rows.length === 0) return [];
    if (b.type === "recirc") return [{ type: "recirc", label: b.label, articles: [] }];
    return [b];
  });
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

export function ArticlePreview({ data }: { data: PreviewData }) {
  const { t, locale } = useI18n();
  const p = t.admin.editor.preview;
  const { detail } = data;
  const label = str(detail.label) || str(detail.eyebrow);
  const blocks = drawable(data.blocks);

  return (
    <div className="grid gap-6">
      <Notice tone="info">{p.note}</Notice>
      <PreviewBoundary fallback={<Notice tone="warning">{p.broken}</Notice>} resetKey={`${data.image}|${data.blocks.length}`}>
        <article className="overflow-hidden rounded-md border border-border bg-bg">
          <ArticleHead
            kicker={
              <>
                <Badge>{data.sectionName}</Badge>
                {label && (
                  <Text as="span" variant="index" tone="muted">
                    {label}
                  </Text>
                )}
              </>
            }
            title={data.title || p.untitled}
            standfirst={data.standfirst}
            byline={
              <>
                <Byline author={data.author} locale={locale} />
                <ArticleMeta date={data.date} updated={str(detail.updated) || undefined} mins={data.mins} locale={locale} />
              </>
            }
          />
          {usable(data.image) && (
            <Container>
              <Frame
                src={data.image}
                alt={str(detail.heroAlt)}
                ratio="16x9"
                caption={str(detail.heroCaption)}
                credit={str(detail.heroCredit)}
                sizes="(max-width: 1280px) 100vw, 1280px"
              />
            </Container>
          )}
          <Container className="py-12">
            {blocks.length ? (
              <ArticleBody blocks={blocks} locale={locale} dropcap={detail.dropcap === true} />
            ) : (
              <Text tone="muted" center>
                {p.noBody}
              </Text>
            )}
          </Container>
        </article>
      </PreviewBoundary>
    </div>
  );
}

/** next/image throws for an address it was not told about; the preview must survive that. */
class PreviewBoundary extends Component<{ children: ReactNode; fallback: ReactNode; resetKey: string }, { failedFor: string | null }> {
  state = { failedFor: null as string | null };

  static getDerivedStateFromError() {
    return { failedFor: "" };
  }

  componentDidCatch() {
    this.setState({ failedFor: this.props.resetKey });
  }

  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.failedFor !== null) this.setState({ failedFor: null });
  }

  render() {
    return this.state.failedFor === null ? this.props.children : this.props.fallback;
  }
}
