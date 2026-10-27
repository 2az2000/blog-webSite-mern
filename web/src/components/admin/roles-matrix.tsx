"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Notice } from "@/components/patterns/feedback";
import { Container, Heading, IconCheck, Stack, Text } from "@/components/primitives";
import { routes } from "@/config/routes";
import { useI18n } from "@/i18n/i18n-provider";
import { permissions } from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import type { PermissionGroup, PermissionMatrix } from "@/types/admin";

const GROUPS: PermissionGroup[] = ["access", "stories", "readers", "administration"];
const th = "px-4 py-3 text-center text-overline font-650 tracking-overline text-meta uppercase";

/**
 * Who may do what, straight from the table the server enforces
 * (backend/src/http/permissions.ts): the page cannot drift from the guards,
 * because it prints them. A tick carries a word for screen readers, never colour alone.
 */
export function RolesMatrix() {
  const { t } = useI18n();
  const r = t.admin.rolesPage;
  const roles = t.admin.roles as Record<string, string>;
  const [matrix, setMatrix] = useState<PermissionMatrix | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    permissions.get().then(
      (m) => live && setMatrix(m),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, []);

  return (
    <Container className="py-12">
      <Stack gap={24}>
        <Stack gap={8}>
          <Heading level={1} size="h2">
            {r.title}
          </Heading>
          <Text tone="muted" measure="long">
            {r.lead}
          </Text>
        </Stack>

        {failed && <Notice tone="error">{r.loadFailed}</Notice>}

        {matrix && (
          <div className="overflow-x-auto rounded-md border border-border bg-surface">
            <table className="w-full min-w-panel border-collapse">
              <thead className="border-b border-border">
                <tr>
                  <th scope="col" className={cn(th, "text-start")}>
                    {r.permission}
                  </th>
                  {matrix.roles.map((x) => (
                    <th key={x.role} scope="col" className={th}>
                      {roles[x.role] ?? x.role}
                    </th>
                  ))}
                </tr>
              </thead>
              {GROUPS.map((group) => (
                <tbody key={group} className="divide-y divide-border border-t border-border first:border-t-0">
                  <tr>
                    <th scope="rowgroup" colSpan={matrix.roles.length + 1} className="bg-surface-sunk px-4 py-2 text-start text-overline font-650 tracking-overline text-meta uppercase">
                      {r.groups[group]}
                    </th>
                  </tr>
                  {matrix.permissions
                    .filter((p) => p.group === group)
                    .map((p) => (
                      <tr key={p.key}>
                        <th scope="row" className="px-4 py-3 text-start text-body-sm font-normal text-fg-soft">
                          <span className="font-semibold text-fg">{r.names[p.key] ?? p.note}</span>
                          {r.notes[p.key] && <span className="block text-caption text-meta">{r.notes[p.key]}</span>}
                        </th>
                        {matrix.roles.map((x) => {
                          const allowed = p.roles.includes(x.role);
                          return (
                            <td key={x.role} className="px-4 py-3 text-center align-middle">
                              {allowed ? (
                                <span className="inline-flex text-success [&_svg]:size-5">
                                  <IconCheck aria-hidden="true" />
                                  <span className="sr-only">{r.allowed}</span>
                                </span>
                              ) : (
                                <span className="text-muted-soft">
                                  <span aria-hidden="true">–</span>
                                  <span className="sr-only">{r.denied}</span>
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </tbody>
              ))}
            </table>
          </div>
        )}

        <Link href={routes.adminUsers()} className="text-label font-550 text-brand underline underline-offset-3">
          {r.change}
        </Link>
      </Stack>
    </Container>
  );
}
