"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Field } from "@/components/patterns/field";
import { Notice } from "@/components/patterns/feedback";
import { Button, Cluster, Container, Heading, Input, Select, Stack, Text, Textarea } from "@/components/primitives";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { notify } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { routes } from "@/config/routes";
import { useI18n } from "@/i18n/i18n-provider";
import { ApiError } from "@/lib/api";
import { articles, directory, type AuthorChoice } from "@/lib/admin-api";
import { formatDateTime, formatNumber } from "@/lib/format";
import { EDITORIAL, type AdminArticle, type ArticleStatus, type Choice, type Revision } from "@/types/admin";
import type { Author, BodyBlock } from "@/types/content";

import { useSession } from "./admin-session";
import { ArticlePreview } from "./article-preview";
import { BlockEditor, keyed, type KeyedBlock } from "./block-editor";
import { errorDetails, errorMessage } from "./error-message";
import { detailDefaults, detailFields, type Obj } from "./field-schema";
import { FieldsEditor } from "./fields-editor";
import { StatusBadge } from "./status-badge";

/* — Draft state ——————————————————————————————————————————— */

type Draft = {
  title: string;
  slug: string;
  standfirst: string;
  section: string;
  author: string;
  mins: number;
  image: string;
  tags: string;
  detail: Obj;
  body: KeyedBlock[];
};

const toDraft = (a: AdminArticle, withDefaults: boolean): Draft => ({
  title: a.title,
  slug: a.slug,
  standfirst: a.standfirst,
  section: a.section,
  author: a.author,
  mins: a.mins,
  image: a.image,
  tags: a.tags.join(", "),
  // The baseline keeps the server's detail as it is; the form shows it completed with the page's defaults.
  detail: withDefaults ? { ...detailDefaults(a.kind), ...a.detail } : a.detail,
  body: a.body.map(keyed),
});

const parseTags = (s: string): string[] =>
  s
    .split(",")
    .map((x) => x.trim().toLowerCase().replace(/\s+/g, "-"))
    .filter(Boolean);

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Only the fields that differ from the last saved state — an untouched field is never re-sent. */
function changes(d: Draft, base: Draft, article: AdminArticle): Obj {
  const out: Obj = {};
  if (d.title !== base.title) out.title = d.title;
  if (d.slug !== base.slug && !article.publishedAt) out.slug = d.slug;
  if (d.standfirst !== base.standfirst) out.standfirst = d.standfirst;
  if (d.section !== base.section) out.section = d.section;
  if (d.author !== base.author) out.author = d.author;
  if (d.mins !== base.mins) out.mins = d.mins;
  if (d.image !== base.image) out.image = d.image;
  if (!same(parseTags(d.tags), parseTags(base.tags))) out.tags = parseTags(d.tags);
  if (!same(d.detail, base.detail)) out.detail = d.detail;
  if (!same(d.body.map((b) => b.block), base.body.map((b) => b.block))) out.body = d.body.map((b) => b.block);
  return out;
}

const MOVES: Record<ArticleStatus, ArticleStatus[]> = {
  draft: ["published", "scheduled"],
  scheduled: ["published", "scheduled", "draft"],
  published: ["archived", "draft"],
  archived: ["published", "draft"],
};

type Problem = { message: string; lines: string[] };

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/** Wide screens get the preview beside the form; narrower ones get it as a tab. */
function useWide(): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1281px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return wide;
}

/* — The editor ———————————————————————————————————————————— */

export function ArticleEditor({ id }: { id: string }) {
  const { t, locale } = useI18n();
  const e = t.admin.editor;
  const f = t.admin.fields;
  const router = useRouter();
  const { me } = useSession();
  const wide = useWide();

  const [article, setArticle] = useState<AdminArticle | null>(null);
  const [base, setBase] = useState<Draft | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [sections, setSections] = useState<Choice[]>([]);
  const [authors, setAuthors] = useState<AuthorChoice[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [tab, setTab] = useState("details");
  const [when, setWhen] = useState("");
  const [revisions, setRevisions] = useState<Revision[] | null>(null);

  const apply = useCallback((a: AdminArticle) => {
    setArticle(a);
    setBase(toDraft(a, false));
    setDraft(toDraft(a, true));
  }, []);

  useEffect(() => {
    let live = true;
    articles.get(id).then(
      (a) => live && apply(a),
      () => live && setLoadFailed(true),
    );
    void directory.sections().then((s) => live && setSections(s), () => undefined);
    void directory.authors().then((a) => live && setAuthors(a), () => undefined);
    return () => {
      live = false;
    };
  }, [id, apply]);

  useEffect(() => {
    if (tab !== "history" || !article) return;
    void articles.revisions(id).then(setRevisions, () => setRevisions([]));
  }, [tab, id, article?.version]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loadFailed) {
    return (
      <Container className="py-12">
        <Notice tone="error">{e.loadFailed}</Notice>
      </Container>
    );
  }
  if (!article || !base || !draft) {
    return (
      <Container className="py-12">
        <Text tone="muted" role="status">
          {e.loading}
        </Text>
      </Container>
    );
  }

  const readOnly = !EDITORIAL.includes(me.role) && article.status !== "draft";
  const canMove = EDITORIAL.includes(me.role);
  const pending = changes(draft, base, article);
  const dirty = Object.keys(pending).length > 0;

  const patch = (next: Partial<Draft>) => setDraft({ ...draft, ...next });

  const fail = (err: unknown) => {
    if (err instanceof ApiError) setProblem({ message: errorMessage(err, t), lines: errorDetails(err) });
    else setProblem({ message: t.admin.gate.failed, lines: [] });
  };

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setProblem(null);
    try {
      await work();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    run(async () => {
      apply(await articles.update(id, { ...pending, baseVersion: article.version }));
      notify(e.saved);
    });

  const move = (to: ArticleStatus) =>
    run(async () => {
      const scheduledFor = to === "scheduled" ? new Date(when).toISOString() : undefined;
      apply(await articles.setStatus(id, to, scheduledFor));
      notify(e.moved(t.admin.status[to]));
    });

  const restore = (version: number) =>
    run(async () => {
      apply(await articles.restore(id, version));
      notify(e.history.restored(formatNumber(version, locale)));
    });

  const remove = () =>
    run(async () => {
      await articles.remove(id);
      notify(e.delete.done);
      router.push(routes.adminArticles());
    });

  const sectionName = sections.find((s) => s.slug === draft.section)?.name ?? draft.section;
  const byline = authors.find((a) => a.slug === draft.author);
  const previewAuthor: Author = byline ?? {
    slug: draft.author,
    name: me.name,
    initials: initialsOf(me.name),
    role: t.admin.roles[me.role],
    since: new Date().getUTCFullYear(),
    bio: "",
  };
  const preview = (
    <ArticlePreview
      data={{
        title: draft.title,
        standfirst: draft.standfirst,
        sectionName,
        mins: draft.mins,
        date: (article.publishedAt ?? new Date().toISOString()).slice(0, 10),
        image: draft.image,
        detail: draft.detail,
        blocks: draft.body.map((b) => b.block as BodyBlock),
        author: previewAuthor,
      }}
    />
  );

  const options = (list: Choice[], current: string) =>
    list.some((x) => x.slug === current) || !current ? list : [...list, { slug: current, name: current }];

  const moveLabel = (to: ArticleStatus): string => {
    const a = e.actions;
    if (to === "published") return a.publish;
    if (to === "archived") return a.archive;
    if (to === "scheduled") return article.status === "scheduled" ? a.reschedule : a.schedule;
    return article.status === "published" ? a.unpublish : a.toDraft;
  };

  return (
    <Container className="py-8">
      <Stack gap={24}>
        <Link href={routes.adminArticles()} className="text-label font-550 text-meta hover:text-fg">
          ← {e.back}
        </Link>

        {/* Title row, state and the one Save */}
        <Cluster justify="between" gap={16} align="start">
          <Stack gap={8}>
            <Heading level={1} size="h2">
              {draft.title || e.preview.untitled}
            </Heading>
            <Cluster gap={12}>
              <StatusBadge status={article.status} />
              <Text variant="meta" as="span">
                {e.version(formatNumber(article.version, locale))}
              </Text>
              {article.publishedAt && (
                <Text variant="meta" as="span">
                  {formatDateTime(article.publishedAt, locale)}
                </Text>
              )}
              <Text variant="meta" as="span" aria-live="polite">
                {dirty ? e.unsaved : ""}
              </Text>
            </Cluster>
          </Stack>
          <Button onClick={save} disabled={!dirty || readOnly || busy} loading={busy}>
            {e.save}
          </Button>
        </Cluster>

        {readOnly && <Notice tone="info">{e.readOnly}</Notice>}
        {problem && (
          <Notice tone="error">
            {problem.message}
            {problem.lines.length > 0 && (
              <ul className="mt-2 list-disc ps-5">
                {problem.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
          </Notice>
        )}

        {/* Status workflow (editors) */}
        {canMove && (
          <Stack gap={12} className="rounded-md border border-border bg-surface p-6 max-md:p-4">
            <Cluster gap={8}>
              {MOVES[article.status].map((to) =>
                to === "scheduled" ? null : (
                  <Button
                    key={to}
                    variant={to === "published" ? "primary" : "secondary"}
                    size="sm"
                    disabled={dirty || busy}
                    onClick={() => move(to)}
                  >
                    {moveLabel(to)}
                  </Button>
                ),
              )}
            </Cluster>
            {MOVES[article.status].includes("scheduled") && (
              <Cluster gap={8} align="end">
                <Field label={e.scheduledFor}>
                  <Input type="datetime-local" value={when} onChange={(ev) => setWhen(ev.target.value)} />
                </Field>
                <Button variant="secondary" size="sm" disabled={!when || dirty || busy} onClick={() => move("scheduled")}>
                  {moveLabel("scheduled")}
                </Button>
              </Cluster>
            )}
            {dirty && <Text variant="caption">{e.saveFirst}</Text>}
          </Stack>
        )}

        <div className={wide ? "grid grid-cols-2 items-start gap-8" : undefined}>
          <Tabs value={wide && tab === "preview" ? "details" : tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="details">{e.tabs.details}</TabsTrigger>
              <TabsTrigger value="body">{e.tabs.body}</TabsTrigger>
              {!wide && <TabsTrigger value="preview">{e.tabs.preview}</TabsTrigger>}
              <TabsTrigger value="history">{e.tabs.history}</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="pt-8">
              <Stack gap={16}>
                <Field label={f.title}>
                  <Input value={draft.title} disabled={readOnly} onChange={(ev) => patch({ title: ev.target.value })} />
                </Field>
                <Field label={f.slug} hint={article.publishedAt ? e.slugLocked : undefined}>
                  <Input value={draft.slug} disabled={readOnly || Boolean(article.publishedAt)} onChange={(ev) => patch({ slug: ev.target.value })} />
                </Field>
                <Field label={f.standfirst}>
                  <Textarea value={draft.standfirst} disabled={readOnly} onChange={(ev) => patch({ standfirst: ev.target.value })} />
                </Field>
                <Field label={f.kind} hint={e.kindLocked}>
                  <Input value={(t.admin.kinds as Record<string, string>)[article.kind] ?? article.kind} disabled readOnly />
                </Field>
                <Field label={f.section}>
                  <Select value={draft.section} disabled={readOnly} onChange={(ev) => patch({ section: ev.target.value })}>
                    {options(sections, draft.section).map((s) => (
                      <option key={s.slug} value={s.slug}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={f.author}>
                  <Select value={draft.author} disabled={readOnly} onChange={(ev) => patch({ author: ev.target.value })}>
                    {options(authors, draft.author).map((a) => (
                      <option key={a.slug} value={a.slug}>
                        {a.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={f.mins}>
                  <Input type="number" min={1} value={draft.mins} disabled={readOnly} onChange={(ev) => patch({ mins: Number(ev.target.value) })} />
                </Field>
                <Field label={f.tags} hint={e.tagsHint}>
                  <Input value={draft.tags} disabled={readOnly} onChange={(ev) => patch({ tags: ev.target.value })} />
                </Field>
                <FieldsEditor
                  idBase="lead"
                  fields={[{ key: "image", kind: "image" }]}
                  value={{ image: draft.image, alt: draft.title }}
                  disabled={readOnly}
                  onChange={(next) => patch({ image: String(next.image ?? "") })}
                />
                <Heading level={2} size="h4" mt={16}>
                  {e.pageCopy}
                </Heading>
                <FieldsEditor
                  idBase="detail"
                  fields={detailFields(article.kind)}
                  value={draft.detail}
                  disabled={readOnly}
                  onChange={(detail) => patch({ detail })}
                />
              </Stack>
            </TabsContent>

            <TabsContent value="body" className="pt-8">
              <BlockEditor blocks={draft.body} disabled={readOnly} onChange={(body) => patch({ body })} />
            </TabsContent>

            {!wide && (
              <TabsContent value="preview" className="pt-8">
                {preview}
              </TabsContent>
            )}

            <TabsContent value="history" className="pt-8">
              {revisions && revisions.length === 0 && <Text tone="muted">{e.history.empty}</Text>}
              <ul className="grid list-none gap-3 p-0">
                {revisions?.map((r) => (
                  <li key={r.version} className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-border bg-surface p-4">
                    <Stack gap={4}>
                      <Text strong>{e.version(formatNumber(r.version, locale))}</Text>
                      <Text variant="meta">
                        {formatDateTime(r.createdAt, locale)}
                        {r.editedBy ? ` · ${e.history.by(r.editedBy)}` : ""}
                      </Text>
                    </Stack>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={readOnly || busy || r.version === article.version}
                      onClick={() => restore(r.version)}
                    >
                      {e.history.restore}
                    </Button>
                  </li>
                ))}
              </ul>
            </TabsContent>
          </Tabs>

          {wide && <aside className="sticky top-4 max-h-screen overflow-y-auto">{preview}</aside>}
        </div>

        {me.role === "admin" && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="danger" size="sm">
                {e.actions.delete}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>{e.delete.title}</DialogTitle>
              <DialogDescription className="mt-4">{e.delete.body}</DialogDescription>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary">{e.delete.cancel}</Button>
                </DialogClose>
                <Button variant="danger" onClick={remove}>
                  {e.delete.confirm}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </Stack>
    </Container>
  );
}
