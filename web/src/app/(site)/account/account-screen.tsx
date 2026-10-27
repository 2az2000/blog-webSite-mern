"use client";

import { useState, type FormEvent } from "react";

import { EmptyState, Notice } from "@/components/patterns/feedback";
import { Field } from "@/components/patterns/field";
import { Button, ButtonLink, Cluster, Container, Heading, Input, refLink, Stack, Tag, Text } from "@/components/primitives";
import { notify } from "@/components/ui/sonner";
import { routes } from "@/config/routes";
import { useI18n } from "@/i18n/i18n-provider";
import { ApiError } from "@/lib/api";
import { account } from "@/lib/auth-api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/stores/auth-store";

import { Section } from "./account-section";
import { DevicesSection, DispatchSection, YourDataSection } from "./account-sections";

/*
 * Account settings: one page, six sections, each saving on its own. Everything
 * here acts on the signed-in person's own account; the API checks that again
 * on every call.
 */

const SECTIONS = ["profile", "password", "dispatch", "membership", "devices", "data"] as const;

export function AccountScreen() {
  const { t } = useI18n();
  const a = t.account;
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);

  if (status === "unknown") {
    return (
      <Container narrow className="py-16">
        <Text tone="muted" role="status">
          {a.loading}
        </Text>
      </Container>
    );
  }

  if (status === "out" || !user) {
    return (
      <Container className="py-16">
        <EmptyState
          mark="⌂"
          title={a.signedOut.title}
          headingLevel={2}
          actions={<ButtonLink href={`${routes.signIn()}?next=${encodeURIComponent(routes.account())}`}>{a.signedOut.cta}</ButtonLink>}
        >
          {a.signedOut.body}
        </EmptyState>
      </Container>
    );
  }

  return (
    <Container narrow className="py-12">
      <Stack gap={24}>
        <Stack gap={8}>
          <Heading level={1} size="h2">
            {a.title}
          </Heading>
          <Text tone="muted">{a.lead}</Text>
        </Stack>

        <nav aria-label={a.nav}>
          <Cluster gap={8}>
            {SECTIONS.map((id) => (
              <a key={id} href={`#${id}`} className={cn(refLink.link, "text-label font-550")}>
                {a.sections[id]}
              </a>
            ))}
          </Cluster>
        </nav>

        <Profile />
        <Password />
        <DispatchSection />
        <Membership />
        <DevicesSection />
        <YourDataSection />
      </Stack>
    </Container>
  );
}

function Profile() {
  const { t } = useI18n();
  const p = t.account.profile;
  const roles = t.admin.roles as Record<string, string>;
  const user = useAuth((s) => s.user)!;
  const [name, setName] = useState(user.name);
  const [busy, setBusy] = useState(false);
  const clean = name.trim();
  const invalid = clean.length < 2;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (invalid || clean === user.name) return;
    setBusy(true);
    try {
      const updated = await account.rename(clean);
      useAuth.setState({ user: { ...user, ...updated } });
      notify(p.saved, "success");
    } catch {
      notify(t.form.failed, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section id="profile" title={t.account.sections.profile} lead={p.lead}>
      <form onSubmit={submit} noValidate>
        <Stack gap={16}>
          <Field label={p.name} error={name !== user.name && invalid ? p.nameError : undefined}>
            <Input value={name} maxLength={80} autoComplete="name" onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label={p.email} hint={p.emailHint}>
            <Input value={user.email} readOnly type="email" />
          </Field>
          <Cluster gap={12}>
            <Tag>{p.verified}</Tag>
            <Text as="span" variant="meta">
              {p.role}: {roles[user.role] ?? user.role}
            </Text>
          </Cluster>
          <div>
            <Button type="submit" loading={busy} disabled={invalid || clean === user.name}>
              {p.save}
            </Button>
          </div>
        </Stack>
      </form>
    </Section>
  );
}

function Password() {
  const { t } = useI18n();
  const p = t.account.password;
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [error, setError] = useState<{ field: "current" | "next"; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) {
      setError({ field: "next", message: t.form.passwordError });
      return;
    }
    if (next === current) {
      setError({ field: "next", message: p.same });
      return;
    }
    setBusy(true);
    try {
      await account.changePassword(current, next);
      setCurrent("");
      setNext("");
      notify(p.saved, "success");
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      if (code === "WRONG_CURRENT_PASSWORD") setError({ field: "current", message: p.wrong });
      else if (code === "SAME_PASSWORD") setError({ field: "next", message: p.same });
      else notify(t.form.failed, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section id="password" title={t.account.sections.password} lead={p.lead}>
      <form onSubmit={submit} noValidate>
        <Stack gap={16}>
          <Field label={p.current} error={error?.field === "current" ? error.message : undefined}>
            <Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </Field>
          <Field label={p.next} hint={p.hint} error={error?.field === "next" ? error.message : undefined}>
            <Input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
          </Field>
          <div>
            <Button type="submit" loading={busy} disabled={!current || !next}>
              {p.save}
            </Button>
          </div>
        </Stack>
      </form>
    </Section>
  );
}

function Membership() {
  const { t } = useI18n();
  const m = t.account.membership;
  return (
    <Section id="membership" title={t.account.sections.membership} lead={m.lead}>
      <Notice tone="info">
        <strong>{m.plan}.</strong> {m.body}
      </Notice>
      <div>
        <ButtonLink href={routes.subscribe()} variant="secondary">
          {m.cta}
        </ButtonLink>
      </div>
    </Section>
  );
}
