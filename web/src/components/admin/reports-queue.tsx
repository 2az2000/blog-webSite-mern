"use client";

import { useEffect, useState } from "react";

import { EmptyState, Notice } from "@/components/patterns/feedback";
import { Button, Cluster, Container, Heading, Stack, Tag, Text } from "@/components/primitives";
import { notify } from "@/components/ui/sonner";
import { useI18n } from "@/i18n/i18n-provider";
import { reports } from "@/lib/admin-api";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { BrokenLinkRow, PageInfo } from "@/types/admin";

const th = "px-4 py-3 text-start text-overline font-650 tracking-overline text-meta uppercase";
const td = "px-4 py-4 align-middle text-body-sm text-fg-soft";

/** Pages readers reported as missing (the "Report the broken link" button on the 404), most reported first. */
export function ReportsQueue() {
  const { t, locale } = useI18n();
  const r = t.admin.reports;
  const [resolved, setResolved] = useState(false);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<BrokenLinkRow[] | null>(null);
  const [info, setInfo] = useState<PageInfo | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    reports.list(resolved, page).then(
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
  }, [resolved, page, tick]);

  const resolve = async (id: string) => {
    setBusy(true);
    try {
      await reports.resolve(id);
      notify(r.done, "success");
      setTick((n) => n + 1);
    } catch {
      notify(t.form.failed, "error");
    } finally {
      setBusy(false);
    }
  };

  const pages = info ? Math.max(1, Math.ceil(info.total / info.limit)) : 1;

  return (
    <Container className="py-12">
      <Stack gap={24}>
        <Stack gap={8}>
          <Heading level={1} size="h2">
            {r.title}
          </Heading>
          <Text tone="muted">{r.lead}</Text>
        </Stack>

        <Cluster gap={8} role="group" aria-label={r.title}>
          {([false, true] as const).map((value) => (
            <Tag
              key={String(value)}
              aria-pressed={resolved === value}
              onClick={() => {
                setResolved(value);
                setPage(1);
                setRows(null);
              }}
            >
              {value ? r.tabs.resolved : r.tabs.open}
            </Tag>
          ))}
        </Cluster>

        {failed && <Notice tone="error">{r.loadFailed}</Notice>}
        {rows && rows.length === 0 && !failed && <EmptyState title={r.empty} />}

        {rows && rows.length > 0 && (
          <div className="overflow-x-auto rounded-md border border-border bg-surface">
            <table className="w-full min-w-panel border-collapse">
              <thead className="border-b border-border">
                <tr>
                  <th scope="col" className={th}>{r.columns.path}</th>
                  <th scope="col" className={th}>{r.columns.count}</th>
                  <th scope="col" className={th}>{r.columns.referrer}</th>
                  <th scope="col" className={th}>{r.columns.lastSeen}</th>
                  <th scope="col" className={th}>
                    <span className="sr-only">{r.resolve}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className={td}>
                      <code className="break-all text-fg">{row.path}</code>
                    </td>
                    <td className={td}>{formatNumber(row.count, locale)}</td>
                    <td className={td}>{row.referrer ? <span className="break-all">{row.referrer}</span> : "—"}</td>
                    <td className={td}>{formatDateTime(row.lastSeenAt, locale)}</td>
                    <td className={td}>
                      {!row.resolved && (
                        <Button size="sm" variant="secondary" disabled={busy} onClick={() => void resolve(row.id)}>
                          {r.resolve}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {info && info.total > info.limit && (
          <Cluster justify="between" gap={16}>
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              {t.admin.list.previous}
            </Button>
            <Text variant="meta" as="span">
              {t.admin.list.page(formatNumber(page, locale), formatNumber(pages, locale))}
            </Text>
            <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
              {t.admin.list.next}
            </Button>
          </Cluster>
        )}
      </Stack>
    </Container>
  );
}
