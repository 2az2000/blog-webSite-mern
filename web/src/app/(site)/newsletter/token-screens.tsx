"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Notice } from "@/components/patterns/feedback";
import { SuccessPanel } from "@/components/patterns/forms";
import { notify } from "@/components/ui/sonner";
import { Button, ButtonLink, Cluster, Radio, Stack, Tag, Text } from "@/components/primitives";
import { routes } from "@/config/routes";
import { useI18n } from "@/i18n/i18n-provider";
import { ApiError } from "@/lib/api";
import { newsletter, type DispatchPrefs } from "@/lib/reader-api";
import { DISPATCH_TOPICS, type Frequency } from "@/stores/dispatch-prefs-store";

/*
 * The two screens an e-mail link opens: confirming a subscription, and managing
 * or leaving one. Both work without an account — the link carries the key.
 */

const FREQUENCIES: { value: Frequency; strong: string; rest: string }[] = [
  { value: "both", strong: "Twice a week", rest: " — Tuesday and Friday. The default." },
  { value: "weekly", strong: "Friday only", rest: " — the week in one issue." },
  { value: "monthly", strong: "Monthly", rest: " — long reads and investigations only." },
];

const gone = (err: unknown) => err instanceof ApiError && (err.status === 404 || err.status === 400);

function BadLink({ children }: { children: string }) {
  return (
    <Stack gap={16}>
      <Notice tone="error">{children}</Notice>
      <div>
        <ButtonLink href={routes.newsletter()} variant="secondary">
          Back to the Dispatch
        </ButtonLink>
      </div>
    </Stack>
  );
}

/** Opens from the confirmation e-mail. */
export function ConfirmScreen({ token }: { token: string }) {
  const [state, setState] = useState<
    { phase: "working" } | { phase: "done"; prefs: DispatchPrefs & { manageToken: string } } | { phase: "bad"; message: string }
  >(token ? { phase: "working" } : { phase: "bad", message: "This link is incomplete. Use the one in the e-mail." });

  useEffect(() => {
    if (!token) return;
    let live = true;
    newsletter.confirm(token).then(
      (prefs) => live && setState({ phase: "done", prefs }),
      (err) =>
        live &&
        setState({
          phase: "bad",
          message:
            err instanceof ApiError && err.code === "CONFIRM_TOKEN_EXPIRED"
              ? "This link has expired. Sign up again and we will send a fresh one."
              : gone(err)
                ? "This link is not valid, or has already been used. If you are subscribed you do not need it again."
                : "We could not reach the server. Try the link again in a moment.",
        }),
    );
    return () => {
      live = false;
    };
  }, [token]);

  if (state.phase === "working") {
    return (
      <Text tone="muted" role="status">
        Confirming…
      </Text>
    );
  }
  if (state.phase === "bad") return <BadLink>{state.message}</BadLink>;

  const { prefs } = state;
  return (
    <SuccessPanel
      eyebrow="You are subscribed"
      title="Welcome to the Dispatch"
      action={
        <Cluster gap={12} mt={16}>
          <ButtonLink href={`${routes.newsletter()}/manage?token=${encodeURIComponent(prefs.manageToken)}`} variant="secondary" size="sm">
            Choose your topics
          </ButtonLink>
          <ButtonLink href={routes.home()} variant="ghost" size="sm">
            Back to the homepage
          </ButtonLink>
        </Cluster>
      }
    >
      {prefs.email} is confirmed.{" "}
      {prefs.frequency === "monthly"
        ? "The monthly long-read digest is on its way."
        : prefs.frequency === "weekly"
          ? "The Dispatch arrives on Fridays."
          : "The Dispatch arrives on Tuesdays and Fridays."}{" "}
      Every issue ends with a link to change this or leave.
    </SuccessPanel>
  );
}

/** Opens from the link at the foot of every issue. */
export function ManageScreen({ token }: { token: string }) {
  const { t } = useI18n();
  const [prefs, setPrefs] = useState<DispatchPrefs | null>(null);
  const [bad, setBad] = useState<string | null>(token ? null : "This link is incomplete. Use the one at the foot of an issue.");
  const [topics, setTopics] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<Frequency>("both");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    let live = true;
    newsletter.prefs(token).then(
      (p) => {
        if (!live) return;
        setPrefs(p);
        setTopics(p.topics);
        setFrequency(p.frequency);
      },
      (err) => live && setBad(gone(err) ? "This link is not valid. Use the one at the foot of your most recent issue." : "We could not reach the server. Try again in a moment."),
    );
    return () => {
      live = false;
    };
  }, [token]);

  if (bad) return <BadLink>{bad}</BadLink>;
  if (!prefs) {
    return (
      <Text tone="muted" role="status">
        Loading…
      </Text>
    );
  }

  const run = async (work: () => Promise<DispatchPrefs>, done: string) => {
    setBusy(true);
    try {
      setPrefs(await work());
      notify(done, "success", { dismissLabel: t.a11y.dismiss });
    } catch {
      notify(t.form.failed, "error", { dismissLabel: t.a11y.dismiss });
    } finally {
      setBusy(false);
    }
  };

  if (prefs.status === "unsubscribed") {
    return (
      <SuccessPanel
        eyebrow="Unsubscribed"
        title="You will not get another issue"
        action={
          <Cluster gap={12} mt={16}>
            <Button variant="secondary" size="sm" loading={busy} onClick={() => void run(() => newsletter.resubscribe(token), "Welcome back")}>
              Changed your mind? Subscribe again
            </Button>
            <ButtonLink href={routes.home()} variant="ghost" size="sm">
              Back to the homepage
            </ButtonLink>
          </Cluster>
        }
      >
        {prefs.email} has been taken off the list. Nothing else was asked of you.
      </SuccessPanel>
    );
  }

  if (prefs.status === "pending") {
    return (
      <Notice tone="warning">
        {prefs.email} has not confirmed yet. Open the link in the confirmation e-mail we sent, or{" "}
        <Link href={routes.newsletter()} className="underline">
          sign up again
        </Link>{" "}
        for a new one.
      </Notice>
    );
  }

  const same = frequency === prefs.frequency && topics.slice().sort().join() === prefs.topics.slice().sort().join();

  return (
    <Stack gap={32}>
      <Text tone="muted">
        Subscribed as <strong className="text-fg">{prefs.email}</strong>.
      </Text>

      <Stack gap={12} as="fieldset" className="m-0 border-0 p-0">
        <legend className="mb-3 text-label font-semibold text-fg">How often</legend>
        {FREQUENCIES.map((f) => (
          <Radio
            key={f.value}
            name="freq"
            value={f.value}
            checked={frequency === f.value}
            onChange={() => setFrequency(f.value)}
            label={
              <>
                <strong className="text-fg">{f.strong}</strong>
                {f.rest}
              </>
            }
          />
        ))}
      </Stack>

      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-3 text-label font-semibold text-fg">Topics (none selected: everything)</legend>
        <Cluster gap={8}>
          {DISPATCH_TOPICS.map((topic) => (
            <Tag
              key={topic.key}
              aria-pressed={topics.includes(topic.key)}
              onClick={() => setTopics((cur) => (cur.includes(topic.key) ? cur.filter((x) => x !== topic.key) : [...cur, topic.key]))}
            >
              {topic.label}
            </Tag>
          ))}
        </Cluster>
      </fieldset>

      <Cluster gap={16}>
        <Button disabled={same || busy} loading={busy} onClick={() => void run(() => newsletter.update(token, { frequency, topics }), "Preferences saved")}>
          Save preferences
        </Button>
        <Button variant="danger" disabled={busy} onClick={() => void run(() => newsletter.unsubscribe(token), "You are unsubscribed")}>
          Unsubscribe
        </Button>
      </Cluster>
    </Stack>
  );
}
