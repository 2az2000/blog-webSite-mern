"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { EmptyState, Notice } from "@/components/patterns/feedback";
import { Button, ButtonLink, Cluster, Container, Heading, Input, Stack, Tag, Text } from "@/components/primitives";
import { routes } from "@/config/routes";
import { useI18n } from "@/i18n/i18n-provider";
import { articles } from "@/lib/admin-api";
import { formatDateTime, formatNumber } from "@/lib/format";
import { ARTICLE_STATUSES, type AdminRow, type ArticleStatus, type PageInfo } from "@/types/admin";

import { StatusBadge } from "./status-badge";

const th = "px-4 py-3 text-start text-overline font-650 tracking-overline text-meta uppercase";
const td = "px-4 py-4 align-top text-body-sm text-fg-soft";

/** Every article the signed-in person may see (writers: their own), filterable by status and title. */
export function ArticleList() {
  const { t, locale } = useI18n();
  const l = t.admin.list;
  const [status, setStatus] = useState<ArticleStatus | undefined>();
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AdminRow[] | null>(null);
  const [info, setInfo] = useState<PageInfo | null>(null);
  const [failed, setFailed] = useState(false);

  // a typed search waits for a pause before it asks the server
  useEffect(() => {
    const id = setTimeout(() => {
      setQuery(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    let live = true;
    articles.list({ status, q: query || undefined, page }).then(
      (res) => {
        if (!live) return;
        setRows(res.data);
        setInfo(res.page);
        setFailed(false);
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [status, query, page]);

  const pages = info ? Math.max(1, Math.ceil(info.total / info.limit)) : 1;
  const kinds = t.admin.kinds as Record<string, string>;

  return (
    <Container className="py-12">
      <Stack gap={24}>
        <Cluster justify="between" gap={16}>
          <Heading level={1} size="h2">
            {l.title}
          </Heading>
          <ButtonLink href={routes.adminNew()}>{l.create}</ButtonLink>
        </Cluster>

        <Cluster gap={8} role="group" aria-label={l.title}>
          <Tag aria-pressed={status === undefined} onClick={() => { setStatus(undefined); setPage(1); }}>
            {l.all}
          </Tag>
          {ARTICLE_STATUSES.map((s) => (
            <Tag key={s} aria-pressed={status === s} onClick={() => { setStatus(s); setPage(1); }}>
              {t.admin.status[s]}
            </Tag>
          ))}
        </Cluster>

        <Input type="search" aria-label={l.searchLabel} placeholder={l.searchLabel} value={q} onChange={(e) => setQ(e.target.value)} className="max-w-panel" />

        {failed && <Notice tone="error">{l.loadFailed}</Notice>}

        {rows && rows.length === 0 && !failed && <EmptyState title={l.empty} />}

        {rows && rows.length > 0 && (
          <div className="overflow-x-auto rounded-md border border-border bg-surface">
            <table className="w-full min-w-panel border-collapse">
              <thead className="border-b border-border">
                <tr>
                  <th scope="col" className={th}>{l.columns.title}</th>
                  <th scope="col" className={th}>{l.columns.kind}</th>
                  <th scope="col" className={th}>{l.columns.section}</th>
                  <th scope="col" className={th}>{l.columns.author}</th>
                  <th scope="col" className={th}>{l.columns.status}</th>
                  <th scope="col" className={th}>{l.columns.updated}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className={td}>
                      <Link href={routes.adminArticle(r.id)} className="font-semibold text-fg hover:text-brand">
                        {r.title}
                      </Link>
                    </td>
                    <td className={td}>{kinds[r.kind] ?? r.kind}</td>
                    <td className={td}>{r.section}</td>
                    <td className={td}>{r.author || "—"}</td>
                    <td className={td}>
                      <StatusBadge status={r.status} />
                    </td>
                    <td className={td}>{formatDateTime(r.updatedAt, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {info && (
          <Cluster justify="between" gap={16}>
            <Text variant="meta">{l.total(formatNumber(info.total, locale))}</Text>
            <Cluster gap={8}>
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                {l.previous}
              </Button>
              <Text variant="meta" as="span">
                {l.page(formatNumber(page, locale), formatNumber(pages, locale))}
              </Text>
              <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
                {l.next}
              </Button>
            </Cluster>
          </Cluster>
        )}
      </Stack>
    </Container>
  );
}
