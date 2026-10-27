"use client";

import { useEffect, useState } from "react";

import { EmptyState, Notice } from "@/components/patterns/feedback";
import { Button, Container, Heading, Input, Select, Stack, Text } from "@/components/primitives";
import { notify } from "@/components/ui/sonner";
import { useI18n } from "@/i18n/i18n-provider";
import { accounts } from "@/lib/admin-api";
import { formatDateTime, formatNumber } from "@/lib/format";
import { type AccountRow, type PageInfo, type Role } from "@/types/admin";

import { useSession } from "./admin-session";

const ROLES: Role[] = ["reader", "writer", "editor", "admin"];
const th = "px-4 py-3 text-start text-overline font-650 tracking-overline text-meta uppercase";
const td = "px-4 py-4 align-middle text-body-sm text-fg-soft";

/** Accounts (admin): change a role, suspend or reactivate. Nobody can change themselves. */
export function AccountsList() {
  const { t, locale } = useI18n();
  const u = t.admin.users;
  const roles = t.admin.roles as Record<string, string>;
  const { me } = useSession();
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AccountRow[] | null>(null);
  const [info, setInfo] = useState<PageInfo | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      setQuery(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [q]);

  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    accounts.list(query, page).then(
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
  }, [query, page, tick]);

  const update = async (id: string, patch: { role?: Role; status?: "active" | "suspended" }) => {
    try {
      await accounts.update(id, patch);
      notify(u.updated, "success");
      setTick((n) => n + 1);
    } catch {
      notify(t.form.failed, "error");
    }
  };

  const pages = info ? Math.max(1, Math.ceil(info.total / info.limit)) : 1;

  return (
    <Container className="py-12">
      <Stack gap={24}>
        <Heading level={1} size="h2">
          {u.title}
        </Heading>
        <Input type="search" aria-label={u.search} placeholder={u.search} value={q} onChange={(e) => setQ(e.target.value)} className="max-w-panel" />

        {failed && <Notice tone="error">{u.loadFailed}</Notice>}
        {rows && rows.length === 0 && !failed && <EmptyState title={t.admin.list.empty} />}

        {rows && rows.length > 0 && (
          <div className="overflow-x-auto rounded-md border border-border bg-surface">
            <table className="w-full min-w-panel border-collapse">
              <thead className="border-b border-border">
                <tr>
                  <th scope="col" className={th}>{u.columns.name}</th>
                  <th scope="col" className={th}>{u.columns.email}</th>
                  <th scope="col" className={th}>{u.columns.role}</th>
                  <th scope="col" className={th}>{u.columns.status}</th>
                  <th scope="col" className={th}>{u.columns.joined}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => {
                  const self = r.id === me.id;
                  return (
                    <tr key={r.id}>
                      <td className={td}>
                        <span className="font-semibold text-fg">{r.name}</span>
                        {self && <span className="ms-2 text-caption text-meta">({u.you})</span>}
                      </td>
                      <td className={td}>
                        {r.email}
                        {!r.emailVerified && <span className="ms-2 text-caption text-meta">({u.unverified})</span>}
                      </td>
                      <td className={td}>
                        <Select
                          aria-label={`${u.columns.role}: ${r.name}`}
                          value={r.role}
                          disabled={self}
                          onChange={(e) => void update(r.id, { role: e.target.value as Role })}
                        >
                          {ROLES.map((role) => (
                            <option key={role} value={role}>
                              {roles[role]}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className={td}>
                        <Button
                          size="sm"
                          variant={r.status === "active" ? "secondary" : "primary"}
                          disabled={self}
                          onClick={() => void update(r.id, { status: r.status === "active" ? "suspended" : "active" })}
                        >
                          {r.status === "active" ? u.suspend : u.reactivate}
                        </Button>
                        <Text as="span" variant="caption" className="ms-2">
                          {r.status === "active" ? u.active : u.suspended}
                        </Text>
                      </td>
                      <td className={td}>{formatDateTime(r.createdAt, locale)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {info && info.total > info.limit && (
          <div className="flex items-center justify-between gap-4">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              {t.admin.list.previous}
            </Button>
            <Text variant="meta" as="span">
              {t.admin.list.page(formatNumber(page, locale), formatNumber(pages, locale))}
            </Text>
            <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
              {t.admin.list.next}
            </Button>
          </div>
        )}
      </Stack>
    </Container>
  );
}
