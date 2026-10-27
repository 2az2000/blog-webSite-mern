"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button, Cluster, Heading, Stack, Text, refLink } from "@/components/primitives";
import { routes } from "@/config/routes";
import { useI18n } from "@/i18n/i18n-provider";
import { cn } from "@/lib/utils";
import { useConsent } from "@/stores/consent-store";

/*
 * The cookie notice. It asks about one thing, the only optional storage NOVA has
 * (remembered theme, recent searches); the cookies that keep you signed in are
 * essential and are described, not asked about. The two answers are the same size
 * and weight: declining is as easy as agreeing. Shown until a choice exists, and
 * again whenever "Cookie settings" is pressed.
 */
export function CookieNotice() {
  const { t } = useI18n();
  const c = t.consent;
  const { ready, consent, reopened, load, choose } = useConsent();

  useEffect(() => load(), [load]);

  if (!ready || (consent && !reopened)) return null;

  return (
    <section
      aria-label={c.region}
      className={cn(
        "fixed inset-x-4 bottom-4 z-130 mx-auto grid max-w-panel gap-4 rounded-md border border-strong bg-surface p-6 shadow-raised",
        "max-sm:inset-x-2 max-sm:bottom-2 max-sm:p-4 print:hidden",
      )}
    >
      <Stack gap={8}>
        <Heading level={2} size="h4">
          {c.title}
        </Heading>
        <Text variant="small" tone="muted">
          {c.body}{" "}
          <Link href={routes.cookies()} className={refLink.link}>
            {c.policy}
          </Link>
        </Text>
      </Stack>
      <Cluster gap={12}>
        <Button variant="secondary" size="sm" onClick={() => choose(true)}>
          {c.allow}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => choose(false)}>
          {c.essential}
        </Button>
      </Cluster>
    </section>
  );
}

/** The footer's "Cookie settings": brings the notice back so the choice can be changed. */
export function CookieSettingsButton({ className }: { className?: string }) {
  const { t } = useI18n();
  const reopen = useConsent((s) => s.reopen);
  return (
    <button type="button" onClick={reopen} className={cn(refLink.link, "cursor-pointer appearance-none border-0 bg-transparent p-0", className)}>
      {t.consent.settings}
    </button>
  );
}

/** On the Cookie policy page: what is chosen now, and the two ways to change it. */
export function CookieChoicePanel() {
  const { t } = useI18n();
  const c = t.legal.choice;
  const { ready, consent, load, choose } = useConsent();

  useEffect(() => load(), [load]);

  const state = !ready ? "" : consent === null ? c.none : consent.preferences ? c.allowed : c.essential;

  return (
    <div className="grid gap-4 rounded-md border border-border bg-surface p-6 max-sm:p-4">
      <Text role="status" strong>
        {state}
      </Text>
      <Cluster gap={12}>
        <Button variant="secondary" size="sm" aria-pressed={consent?.preferences === true} onClick={() => choose(true)}>
          {c.allow}
        </Button>
        <Button variant="secondary" size="sm" aria-pressed={consent?.preferences === false} onClick={() => choose(false)}>
          {c.essentialOnly}
        </Button>
      </Cluster>
    </div>
  );
}
