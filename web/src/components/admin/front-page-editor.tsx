"use client";

import { useEffect, useState } from "react";

import { Notice } from "@/components/patterns/feedback";
import {
  Button,
  ButtonLink,
  Cluster,
  Container,
  Heading,
  IconArrowDown,
  IconArrowUp,
  IconClose,
  Select,
  Stack,
  Text,
} from "@/components/primitives";
import { notify } from "@/components/ui/sonner";
import { routes } from "@/config/routes";
import { useI18n } from "@/i18n/i18n-provider";
import { ApiError } from "@/lib/api";
import { articles, placement } from "@/lib/admin-api";
import { HOME_SLOTS, type HomePlacementState, type HomeSlot, type Pinned } from "@/types/admin";

import { errorDetails } from "./error-message";

type Option = { slug: string; title: string; kind: string };

const same = (a: Pinned, b: Pinned) => HOME_SLOTS.every((s) => a[s].join("|") === b[s].join("|"));

/**
 * Chooses which stories sit where on the front page. Each slot holds pinned
 * stories; whatever is left empty is filled with the newest suitable ones, so
 * the editor only decides what they care about.
 */
export function FrontPageEditor() {
  const { t } = useI18n();
  const f = t.admin.frontPage;
  const kinds = t.admin.kinds as Record<string, string>;

  const [state, setState] = useState<HomePlacementState | null>(null);
  const [pinned, setPinned] = useState<Pinned | null>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string[] | null>(null);

  useEffect(() => {
    let live = true;
    Promise.all([placement.home(), articles.list({ status: "published", page: 1, limit: 100 })]).then(
      ([home, list]) => {
        if (!live) return;
        setState(home);
        setPinned(home.pinned);
        setOptions(list.data.map((a) => ({ slug: a.slug, title: a.title, kind: a.kind })));
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, []);

  if (failed) {
    return (
      <Container className="py-12">
        <Notice tone="error">{f.loadFailed}</Notice>
      </Container>
    );
  }
  if (!state || !pinned) {
    return (
      <Container className="py-12">
        <Text tone="muted" role="status">
          {t.admin.editor.loading}
        </Text>
      </Container>
    );
  }

  const dirty = !same(pinned, state.pinned);
  const label = (o: Option) => `${o.title} — ${kinds[o.kind] ?? o.kind}`;
  const title = (slug: string) => options.find((o) => o.slug === slug)?.title ?? slug;

  const set = (slot: HomeSlot, list: string[]) => setPinned({ ...pinned, [slot]: list });
  const move = (slot: HomeSlot, i: number, to: number) => {
    const next = [...pinned[slot]];
    const [item] = next.splice(i, 1);
    next.splice(to, 0, item!);
    set(slot, next);
  };

  const save = async () => {
    setBusy(true);
    setProblem(null);
    try {
      const saved = await placement.saveHome(pinned);
      setState(saved);
      setPinned(saved.pinned);
      notify(f.saved, "success");
    } catch (err) {
      setProblem(err instanceof ApiError ? [err.message, ...errorDetails(err)] : [t.form.failed]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Container className="py-12">
      <Stack gap={24}>
        <Cluster justify="between" gap={16} align="start">
          <Stack gap={8}>
            <Heading level={1} size="h2">
              {f.title}
            </Heading>
            <Text tone="muted" measure="wide">
              {f.lead}
            </Text>
          </Stack>
          <Cluster gap={8}>
            <ButtonLink href={routes.home()} variant="secondary" target="_blank" rel="noreferrer">
              {f.viewSite}
            </ButtonLink>
            <Button onClick={save} disabled={!dirty || busy} loading={busy}>
              {f.save}
            </Button>
          </Cluster>
        </Cluster>
        {dirty && (
          <Text variant="meta" aria-live="polite">
            {f.unsaved}
          </Text>
        )}
        {problem && (
          <Notice tone="error">
            {problem[0]}
            {problem.length > 1 && (
              <ul className="mt-2 list-disc ps-5">
                {problem.slice(1).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
          </Notice>
        )}

        {HOME_SLOTS.map((slot) => {
          const max = state.limits[slot];
          const names = f.slots[slot];
          const list = pinned[slot];
          const auto = state.live[slot].filter((x) => !x.pinned);
          const available = options.filter((o) => !list.includes(o.slug)); // the same story may sit in two slots, never twice in one
          return (
            <section key={slot} aria-labelledby={`slot-${slot}`} className="grid gap-4 rounded-md border border-border bg-surface p-6 max-md:p-4">
              <Stack gap={4}>
                <Heading level={2} size="h4" id={`slot-${slot}`}>
                  {names.name}
                </Heading>
                <Text variant="caption">{names.hint}</Text>
              </Stack>

              {list.map((slug, i) => (
                <Cluster key={slug} gap={8} wrap={false}>
                  <Select
                    aria-label={`${names.name} ${i + 1}`}
                    value={slug}
                    onChange={(e) => set(slot, list.map((s, j) => (j === i ? e.target.value : s)))}
                  >
                    <option value={slug}>{title(slug)}</option>
                    {available.map((o) => (
                      <option key={o.slug} value={o.slug}>
                        {label(o)}
                      </option>
                    ))}
                  </Select>
                  <Button variant="ghost" size="sm" aria-label={t.admin.body.moveUp} disabled={i === 0} onClick={() => move(slot, i, i - 1)}>
                    <IconArrowUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={t.admin.body.moveDown}
                    disabled={i === list.length - 1}
                    onClick={() => move(slot, i, i + 1)}
                  >
                    <IconArrowDown />
                  </Button>
                  <Button variant="ghost" size="sm" aria-label={f.remove} onClick={() => set(slot, list.filter((_, j) => j !== i))}>
                    <IconClose />
                  </Button>
                </Cluster>
              ))}

              {list.length < max && (
                <Select
                  aria-label={`${names.name}: ${f.add}`}
                  value=""
                  onChange={(e) => e.target.value && set(slot, [...list, e.target.value])}
                >
                  <option value="">{f.add}</option>
                  {available.map((o) => (
                    <option key={o.slug} value={o.slug}>
                      {label(o)}
                    </option>
                  ))}
                </Select>
              )}

              {auto.length > 0 && <Text variant="caption">{f.auto(auto.map((x) => x.title).join(" · "))}</Text>}
            </section>
          );
        })}
      </Stack>
    </Container>
  );
}
