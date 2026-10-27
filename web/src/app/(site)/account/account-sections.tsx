"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { Notice } from "@/components/patterns/feedback";
import { Field } from "@/components/patterns/field";
import { Button, Cluster, Heading, Input, Radio, Stack, Tag, Text } from "@/components/primitives";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { notify } from "@/components/ui/sonner";
import { routes } from "@/config/routes";
import { useI18n } from "@/i18n/i18n-provider";
import { ApiError } from "@/lib/api";
import { account } from "@/lib/auth-api";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { DispatchPrefs } from "@/lib/reader-api";
import { useAuth } from "@/stores/auth-store";
import { DISPATCH_TOPICS, type Frequency } from "@/stores/dispatch-prefs-store";
import type { Device } from "@/types/admin";

import { Section } from "./account-section";

const FREQUENCIES: Frequency[] = ["both", "weekly", "monthly"];

/** The Dispatch, managed from the account: the mailbox is already proven, so changes need no e-mail round trip. */
export function DispatchSection() {
  const { t } = useI18n();
  const d = t.account.dispatch;
  const user = useAuth((s) => s.user)!;
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [prefs, setPrefs] = useState<DispatchPrefs | null>(null);
  const [topics, setTopics] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<Frequency>("both");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    account.dispatch().then(
      (p) => {
        if (!live) return;
        setPrefs(p);
        if (p) {
          setTopics(p.topics);
          setFrequency(p.frequency);
        }
        setLoaded(true);
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, []);

  const subscribed = prefs?.status === "confirmed";
  const statusLabel = d.status[prefs ? prefs.status : "none"];

  const save = async (body: { subscribed: boolean }, done: string) => {
    setBusy(true);
    try {
      const next = await account.saveDispatch(body.subscribed ? { subscribed: true, topics, frequency } : { subscribed: false });
      setPrefs(next);
      notify(done, "success");
    } catch {
      notify(t.form.failed, "error");
    } finally {
      setBusy(false);
    }
  };

  const toggle = (key: string) => setTopics((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));

  return (
    <Section id="dispatch" title={t.account.sections.dispatch} lead={d.lead(user.email)}>
      {failed && <Notice tone="error">{t.account.loadFailed}</Notice>}
      {loaded && (
        <Stack gap={24}>
          <Cluster gap={12}>
            <Tag aria-label={statusLabel}>{statusLabel}</Tag>
          </Cluster>

          <Stack as="fieldset" gap={12} className="m-0 border-0 p-0">
            <legend className="mb-1 text-label font-semibold text-fg">{d.topics}</legend>
            <Text variant="caption" tone="muted">
              {d.topicsHint}
            </Text>
            <Cluster gap={8}>
              {DISPATCH_TOPICS.map((topic) => (
                <Tag key={topic.key} aria-pressed={topics.includes(topic.key)} onClick={() => toggle(topic.key)}>
                  {topic.label}
                </Tag>
              ))}
            </Cluster>
          </Stack>

          <Stack as="fieldset" gap={12} className="m-0 border-0 p-0">
            <legend className="mb-1 text-label font-semibold text-fg">{d.frequency}</legend>
            {FREQUENCIES.map((f) => (
              <Radio
                key={f}
                name="account-frequency"
                value={f}
                checked={frequency === f}
                onChange={() => setFrequency(f)}
                label={
                  <>
                    <strong className="text-fg">{d.frequencies[f].strong}</strong>
                    {d.frequencies[f].rest}
                  </>
                }
              />
            ))}
          </Stack>

          <Cluster gap={12}>
            <Button loading={busy} onClick={() => void save({ subscribed: true }, subscribed ? d.saved : d.joined)}>
              {subscribed ? d.save : d.subscribe}
            </Button>
            {subscribed && (
              <Button variant="secondary" disabled={busy} onClick={() => void save({ subscribed: false }, d.left)}>
                {d.unsubscribe}
              </Button>
            )}
          </Cluster>
        </Stack>
      )}
    </Section>
  );
}

/** Every device with a live session. Signing one out ends its refresh token, so it cannot come back on its own. */
export function DevicesSection() {
  const { t, locale } = useI18n();
  const d = t.account.devices;
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    account.devices().then(
      (rows) => live && setDevices(rows),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [tick]);

  const others = devices?.filter((x) => !x.current) ?? [];

  const run = async (work: () => Promise<string>) => {
    setBusy(true);
    try {
      notify(await work(), "success");
      setTick((n) => n + 1);
    } catch {
      notify(t.form.failed, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section id="devices" title={t.account.sections.devices} lead={d.lead}>
      {failed && <Notice tone="error">{t.account.loadFailed}</Notice>}
      {devices && (
        <Stack gap={16}>
          <ul className="grid list-none gap-3 p-0">
            {devices.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-4">
                <Stack gap={4}>
                  <Cluster gap={8}>
                    <Text as="span" strong>
                      {x.device}
                    </Text>
                    {x.current && <Tag>{d.current}</Tag>}
                  </Cluster>
                  <Text variant="caption" tone="muted">
                    {d.lastActive(formatDateTime(x.lastActiveAt, locale))} · {d.signedIn(formatDateTime(x.signedInAt, locale))}
                  </Text>
                </Stack>
                {!x.current && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void run(async () => (await account.signOutDevice(x.id), d.deviceOut))}
                  >
                    {d.signOut}
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {others.length > 0 ? (
            <div>
              <Button
                variant="danger"
                disabled={busy}
                onClick={() => void run(async () => d.othersOut(formatNumber(await account.signOutOthers(), locale)))}
              >
                {d.signOutOthers}
              </Button>
            </div>
          ) : (
            <Text variant="caption" tone="muted">
              {d.onlyThis}
            </Text>
          )}
        </Stack>
      )}
    </Section>
  );
}

/** The right to the record (download) and the right to be forgotten (delete, behind the password). */
export function YourDataSection() {
  const { t } = useI18n();
  const router = useRouter();
  const d = t.account.data;
  const [exporting, setExporting] = useState(false);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [wrong, setWrong] = useState(false);
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setExporting(true);
    try {
      const data = await account.exportData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "nova-my-data.json";
      link.click();
      URL.revokeObjectURL(url);
      notify(d.exportDone, "success");
    } catch {
      notify(t.form.failed, "error");
    } finally {
      setExporting(false);
    }
  };

  const remove = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setWrong(false);
    try {
      await account.remove(password);
      setOpen(false);
      await useAuth.getState().signOut();
      notify(d.deleted, "success");
      router.push(routes.home());
    } catch (err) {
      if (err instanceof ApiError && err.code === "WRONG_CURRENT_PASSWORD") setWrong(true);
      else notify(t.form.failed, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section id="data" title={t.account.sections.data} lead={d.lead}>
      <Stack gap={12}>
        <Heading level={3} size="h4">
          {d.exportTitle}
        </Heading>
        <Text tone="muted">{d.exportBody}</Text>
        <div>
          <Button variant="secondary" loading={exporting} onClick={() => void download()}>
            {d.exportCta}
          </Button>
        </div>
      </Stack>

      <Stack gap={12} className="border-t border-border pt-6">
        <Heading level={3} size="h4">
          {d.deleteTitle}
        </Heading>
        <Text tone="muted">{d.deleteBody}</Text>
        <div>
          <Button
            variant="danger"
            onClick={() => {
              setPassword("");
              setWrong(false);
              setOpen(true);
            }}
          >
            {d.deleteCta}
          </Button>
        </div>
      </Stack>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={remove}>
            <DialogTitle>{d.confirmTitle}</DialogTitle>
            <DialogDescription className="mt-4">{d.confirmBody}</DialogDescription>
            <Field label={d.password} className="mt-4" error={wrong ? d.wrong : undefined}>
              <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  {d.cancel}
                </Button>
              </DialogClose>
              <Button type="submit" variant="danger" loading={busy} disabled={!password}>
                {d.confirm}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Section>
  );
}
