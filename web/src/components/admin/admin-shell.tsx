"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { Button, Cluster, Container, Text, Wordmark } from "@/components/primitives";
import { routes } from "@/config/routes";
import { useI18n } from "@/i18n/i18n-provider";

import { EDITORIAL } from "@/types/admin";

import { AdminGate, useSession } from "./admin-session";

/** Chrome of the back office: wordmark, the three places staff go, who is signed in. */
export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <AdminGate>
      <Header />
      <main id="main" className="pb-24">
        {children}
      </main>
    </AdminGate>
  );
}

const navLink = "text-label font-550 text-meta transition-colors duration-180 ease-in-out hover:text-fg";

function Header() {
  const { t } = useI18n();
  const { me, signOut } = useSession();
  const roles = t.admin.roles as Record<string, string>;
  return (
    <header className="border-b border-border bg-surface">
      <Container>
        <Cluster justify="between" gap={24} className="py-4">
          <Cluster gap={24}>
            <Wordmark href={routes.admin()} size="sm" label={t.admin.name} />
            <Text as="span" variant="eyebrow" tone="muted">
              {t.admin.name}
            </Text>
            <nav aria-label={t.admin.navLabel}>
              <Cluster gap={24}>
                <Link href={routes.admin()} className={navLink}>
                  {t.admin.nav.overview}
                </Link>
                <Link href={routes.adminArticles()} className={navLink}>
                  {t.admin.nav.articles}
                </Link>
                <Link href={routes.adminNew()} className={navLink}>
                  {t.admin.nav.newArticle}
                </Link>
                {EDITORIAL.includes(me.role) && (
                  <Link href={routes.adminFrontPage()} className={navLink}>
                    {t.admin.nav.frontPage}
                  </Link>
                )}
                {EDITORIAL.includes(me.role) && (
                  <Link href={routes.adminNewsletter()} className={navLink}>
                    {t.admin.nav.newsletter}
                  </Link>
                )}
                {EDITORIAL.includes(me.role) && (
                  <Link href={routes.adminComments()} className={navLink}>
                    {t.admin.nav.comments}
                  </Link>
                )}
                {EDITORIAL.includes(me.role) && (
                  <Link href={routes.adminReports()} className={navLink}>
                    {t.admin.nav.reports}
                  </Link>
                )}
                {me.role === "admin" && (
                  <Link href={routes.adminUsers()} className={navLink}>
                    {t.admin.nav.users}
                  </Link>
                )}
                {me.role === "admin" && (
                  <Link href={routes.adminRoles()} className={navLink}>
                    {t.admin.nav.roles}
                  </Link>
                )}
                <Link href={routes.home()} className={navLink}>
                  {t.admin.nav.viewSite}
                </Link>
              </Cluster>
            </nav>
          </Cluster>
          <Cluster gap={16}>
            <Text variant="meta">{t.admin.session.signedInAs(me.name, roles[me.role] ?? me.role)}</Text>
            <Button variant="ghost" size="sm" onClick={signOut}>
              {t.admin.session.signOut}
            </Button>
          </Cluster>
        </Cluster>
      </Container>
    </header>
  );
}
