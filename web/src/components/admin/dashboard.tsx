"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { Notice, Panel } from "@/components/patterns/feedback";
import { Cluster, Container, Heading, Stack, Tag, Text } from "@/components/primitives";
import { routes } from "@/config/routes";
import { useI18n } from "@/i18n/i18n-provider";
import { overview } from "@/lib/admin-api";
import { formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ARTICLE_STATUSES, STATS_WINDOWS, SUBSCRIBER_STATUSES, type Overview, type StatsWindow, type TopStory } from "@/types/admin";

const link = "text-brand underline underline-offset-3";
const th = "px-4 py-3 text-start text-overline font-650 tracking-overline text-meta uppercase";
const td = "px-4 py-3 align-middle text-body-sm text-fg-soft";

/** The staff landing page: how much was read, what is read most, and what waits for a person. */
export function Dashboard() {
  const { t, locale } = useI18n();
  const d = t.admin.dashboard;
  const [days, setDays] = useState<StatsWindow>(30);
  const [data, setData] = useState<Overview | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    overview.get(days).then(
      (o) => {
        if (!live) return;
        setData(o);
        setFailed(false);
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [days]);

  const n = (v: number) => formatNumber(v, locale);

  return (
    <Container className="py-12">
      <Stack gap={32}>
        <Cluster justify="between" gap={16}>
          <Stack gap={4}>
            <Heading level={1} size="h2">
              {d.title}
            </Heading>
            {data && (
              <Text variant="meta">{data.scope === "own" ? d.scope.own : d.scope.newsroom}</Text>
            )}
          </Stack>
          <Cluster gap={8} role="group" aria-label={d.period}>
            {STATS_WINDOWS.map((w) => (
              <Tag key={w} aria-pressed={days === w} onClick={() => setDays(w)}>
                {d.window(n(w))}
              </Tag>
            ))}
          </Cluster>
        </Cluster>

        {failed && <Notice tone="error">{d.loadFailed}</Notice>}

        {data && (
          <>
            <Tiles data={data} />
            <Chart data={data} />
            <TopTables data={data} />
            {data.queues && <Waiting data={data} />}
            <Counts data={data} />
            <Text variant="caption" tone="muted">
              {d.note}
            </Text>
          </>
        )}
      </Stack>
    </Container>
  );
}

/* — numbers ———————————————————————————————————————————————— */

function Tiles({ data }: { data: Overview }) {
  const { t, locale } = useI18n();
  const d = t.admin.dashboard;
  const { views, reads, previousViews, previousReads } = data.traffic;
  const pct = new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en", { style: "percent", maximumFractionDigits: 0, signDisplay: "exceptZero" });

  const versus = (now: number, before: number): string => {
    if (before === 0) return now === 0 ? d.tiles.flat : d.tiles.noPrevious;
    const change = (now - before) / before;
    return Math.round(change * 100) === 0 ? d.tiles.flat : d.tiles.vs(pct.format(change));
  };

  const through = views > 0 ? reads / views : null;
  const tiles: { label: string; value: string; note?: string }[] = [
    { label: d.tiles.views, value: formatNumber(views, locale), note: versus(views, previousViews) },
    { label: d.tiles.reads, value: formatNumber(reads, locale), note: versus(reads, previousReads) },
    {
      label: d.tiles.readThrough,
      value: through === null ? "—" : new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en", { style: "percent", maximumFractionDigits: 0 }).format(through),
    },
  ];

  return (
    <dl className="m-0 grid grid-cols-3 gap-4 max-md:grid-cols-1">
      {tiles.map((tile) => (
        <Panel key={tile.label} className="grid gap-1 p-6 max-md:p-4">
          <dt className="text-overline font-650 tracking-overline text-meta uppercase">{tile.label}</dt>
          <dd className="m-0 font-serif text-h2 leading-tight text-fg">{tile.value}</dd>
          {tile.note && <dd className="m-0 text-caption text-meta">{tile.note}</dd>}
        </Panel>
      ))}
    </dl>
  );
}

/* — views per day ———————————————————————————————————————————— */

/**
 * One series, so no legend: the heading names it. Bars stand on the baseline,
 * each is reachable by keyboard and reads out its day, and the same figures are
 * one click away as a table (the chart is never the only way to the numbers).
 */
function Chart({ data }: { data: Overview }) {
  const { t, locale } = useI18n();
  const c = t.admin.dashboard.chart;
  const [asTable, setAsTable] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const { series } = data.traffic;
  const max = Math.max(...series.map((s) => s.views), 0);
  const first = series[0]?.day;
  const last = series[series.length - 1]?.day;
  const shown = hover === null ? null : series[hover];
  const n = (v: number) => formatNumber(v, locale);

  return (
    <Panel className="grid gap-4 p-6 max-md:p-4">
      <Cluster justify="between" gap={12}>
        <Heading level={2} size="h4">
          {c.title}
        </Heading>
        <button type="button" onClick={() => setAsTable((v) => !v)} className={cn(link, "text-caption")}>
          {asTable ? c.asChart : c.asTable}
        </button>
      </Cluster>

      {max === 0 ? (
        <Text tone="muted">{c.none}</Text>
      ) : asTable ? (
        <div className="max-h-96 overflow-auto rounded-md border border-border">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 border-b border-border bg-surface">
              <tr>
                <th scope="col" className={th}>{c.day}</th>
                <th scope="col" className={th}>{c.views}</th>
                <th scope="col" className={th}>{c.reads}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...series].reverse().map((s) => (
                <tr key={s.day}>
                  <th scope="row" className={cn(td, "text-start font-normal")}>{formatDate(s.day, locale)}</th>
                  <td className={td}>{n(s.views)}</td>
                  <td className={td}>{n(s.reads)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-2">
          <div className="flex items-baseline justify-between text-caption text-meta">
            <span>{n(max)}</span>
            <span aria-live="polite" className="min-h-5 text-fg-soft">
              {shown ? c.hover(formatDate(shown.day, locale), n(shown.views), n(shown.reads)) : ""}
            </span>
          </div>
          <div
            role="group"
            aria-label={first && last ? c.label(formatDate(first, locale), formatDate(last, locale)) : c.title}
            className="flex h-40 items-end gap-0.5 border-b border-strong"
            onMouseLeave={() => setHover(null)}
          >
            {series.map((s, i) => (
              <div
                key={s.day}
                tabIndex={0}
                aria-label={c.hover(formatDate(s.day, locale), n(s.views), n(s.reads))}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className="flex h-full min-w-0 flex-1 items-end rounded-t-sm outline-offset-2 hover:bg-surface-sunk focus-visible:bg-surface-sunk"
              >
                <div
                  className="w-full rounded-t-sm bg-brand"
                  style={{ height: s.views === 0 ? 0 : `max(2px, ${(s.views / max) * 100}%)` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-caption text-meta">
            <span>{first ? formatDate(first, locale) : ""}</span>
            <span>{last ? formatDate(last, locale) : ""}</span>
          </div>
        </div>
      )}
    </Panel>
  );
}

/* — most read ————————————————————————————————————————————————— */

function StoryTable({ title, rows, extra }: { title: string; rows: (TopStory & { comments?: number; likes?: number })[]; extra: boolean }) {
  const { t, locale } = useI18n();
  const d = t.admin.dashboard.top;
  const n = (v: number) => formatNumber(v, locale);

  return (
    <Panel className="grid gap-4 p-6 max-md:p-4">
      <Heading level={2} size="h4">
        {title}
      </Heading>
      {rows.length === 0 ? (
        <Text tone="muted">{d.empty}</Text>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-panel border-collapse">
            <thead className="border-b border-border">
              <tr>
                <th scope="col" className={th}>{d.columns.story}</th>
                <th scope="col" className={th}>{d.columns.views}</th>
                <th scope="col" className={th}>{d.columns.reads}</th>
                {extra && <th scope="col" className={th}>{d.columns.comments}</th>}
                {extra && <th scope="col" className={th}>{d.columns.likes}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.slug}>
                  <td className={td}>
                    <Link href={routes.article(r.slug)} className="font-semibold text-fg hover:text-brand">
                      {r.title}
                    </Link>
                  </td>
                  <td className={td}>{n(r.views)}</td>
                  <td className={td}>{n(r.reads)}</td>
                  {extra && <td className={td}>{n(r.comments ?? 0)}</td>}
                  {extra && <td className={td}>{n(r.likes ?? 0)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function TopTables({ data }: { data: Overview }) {
  const { t } = useI18n();
  const d = t.admin.dashboard.top;
  return (
    <Stack gap={16}>
      <StoryTable title={d.title} rows={data.top} extra={false} />
      <StoryTable title={d.allTime} rows={data.topAllTime} extra />
    </Stack>
  );
}

/* — queues and counts ———————————————————————————————————————— */

function Count({ href, label, value }: { href: string; label: string; value: number }) {
  const { locale } = useI18n();
  return (
    <Link
      href={href}
      className="grid gap-1 rounded-md border border-border bg-surface p-4 transition-colors duration-180 ease-in-out hover:border-fg"
    >
      <span className="font-serif text-h3 leading-tight text-fg">{formatNumber(value, locale)}</span>
      <span className="text-caption text-meta">{label}</span>
    </Link>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Panel className="grid gap-4 p-6 max-md:p-4">
      <Heading level={2} size="h4">
        {title}
      </Heading>
      {children}
    </Panel>
  );
}

function Waiting({ data }: { data: Overview }) {
  const { t } = useI18n();
  const q = t.admin.dashboard.queues;
  const queues = data.queues!;
  const total = queues.commentsHeld + queues.commentsReported + queues.brokenLinks;
  return (
    <Block title={q.title}>
      {total === 0 && <Text tone="muted">{q.clear}</Text>}
      <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
        <Count href={routes.adminComments()} label={q.held} value={queues.commentsHeld} />
        <Count href={routes.adminComments()} label={q.reported} value={queues.commentsReported} />
        <Count href={routes.adminReports()} label={q.broken} value={queues.brokenLinks} />
      </div>
    </Block>
  );
}

function Counts({ data }: { data: Overview }) {
  const { t, locale } = useI18n();
  const d = t.admin.dashboard;
  const status = t.admin.status as Record<string, string>;
  const roles = t.admin.roles as Record<string, string>;
  const n = (v: number) => formatNumber(v, locale);

  return (
    <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
      <Block title={d.articles.title}>
        <div className="grid grid-cols-2 gap-4">
          {ARTICLE_STATUSES.map((s) => (
            <Count key={s} href={routes.adminArticles()} label={status[s]} value={data.articles[s] ?? 0} />
          ))}
        </div>
      </Block>

      {data.subscribers && (
        <Block title={d.subscribers.title}>
          <div className="grid grid-cols-3 gap-4">
            {SUBSCRIBER_STATUSES.map((s) => (
              <Count key={s} href={routes.adminNewsletter()} label={d.subscribers[s === "confirmed" ? "confirmed" : s === "pending" ? "pending" : "unsubscribed"]} value={data.subscribers?.[s] ?? 0} />
            ))}
          </div>
          <Link href={routes.adminNewsletter()} className={cn(link, "text-caption")}>
            {d.subscribers.manage}
          </Link>
        </Block>
      )}

      {data.users && (
        <Block title={d.users.title}>
          <Cluster gap={8}>
            {(["reader", "writer", "editor", "admin"] as const).map((r) => (
              <Tag key={r}>
                {roles[r]} · {n(data.users?.[r] ?? 0)}
              </Tag>
            ))}
          </Cluster>
          <Text variant="caption" tone="muted">
            {d.users.fresh(n(data.newUsers ?? 0))}
          </Text>
          <Cluster gap={16}>
            <Link href={routes.adminUsers()} className={cn(link, "text-caption")}>
              {d.users.manage}
            </Link>
            <Link href={routes.adminRoles()} className={cn(link, "text-caption")}>
              {d.users.roles}
            </Link>
          </Cluster>
        </Block>
      )}
    </div>
  );
}
