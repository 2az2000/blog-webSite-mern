import Link from "next/link";
import type { ReactNode } from "react";

import { Breadcrumbs } from "@/components/patterns/navigation";
import { Container, Heading, Stack, Text, refLink } from "@/components/primitives";
import { routes } from "@/config/routes";
import { POLICY_VERSION } from "@/config/legal";
import { legalDocs, type LegalKey } from "@/content/legal";
import { getDictionary, getLocale } from "@/i18n";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/*
 * A legal text laid out to be read: title, plain lead, the date it was last
 * changed, a contents list that jumps to each part, then the parts. The words are
 * in content/legal.ts; this only sets them. `after` slots extra material (the
 * cookie table, the choice panel) in after a given section.
 */

const ORDER: LegalKey[] = ["privacy", "terms", "cookies"];
const HREF: Record<LegalKey, () => string> = { privacy: routes.privacy, terms: routes.terms, cookies: routes.cookies };

export async function LegalDocument({ docKey, after = {} }: { docKey: LegalKey; after?: Record<string, ReactNode> }) {
  const locale = await getLocale();
  const t = await getDictionary(locale);
  const doc = legalDocs[locale][docKey];
  const others = ORDER.filter((k) => k !== docKey);

  return (
    <>
      <Container>
        <Breadcrumbs label={t.a11y.breadcrumb} items={[{ label: t.nav.home, href: routes.home() }, { label: doc.title }]} />
      </Container>
      <Container narrow className="py-12">
        <Stack gap={32}>
          <Stack gap={12}>
            <Heading level={1} size="h2">
              {doc.title}
            </Heading>
            <Text tone="muted">{doc.lead}</Text>
            <Text variant="meta">{t.legal.updated(formatDate(POLICY_VERSION, locale))}</Text>
          </Stack>

          <nav aria-label={t.legal.onThisPage} className="rounded-md border border-border bg-surface p-6 max-sm:p-4">
            <Text variant="eyebrow" tone="muted" mb={8}>
              {t.legal.onThisPage}
            </Text>
            <ol className="m-0 grid list-none gap-2 p-0">
              {doc.sections.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className={cn(refLink.link, "text-body-sm")}>
                    {i + 1}. {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {doc.sections.map((s, i) => (
            <Stack as="section" key={s.id} gap={12} id={s.id} aria-labelledby={`${s.id}-title`} className="scroll-mt-24">
              <Heading level={2} size="h3" id={`${s.id}-title`}>
                {i + 1}. {s.title}
              </Heading>
              {s.paragraphs?.map((p) => (
                <Text key={p} tone="muted">
                  {p}
                </Text>
              ))}
              {s.items && (
                <ul className="m-0 grid gap-3 ps-6 text-fg-soft marker:text-muted-soft">
                  {s.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              {after[s.id]}
            </Stack>
          ))}

          <nav aria-label={t.legal.related} className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-6">
            <Text variant="meta" as="span">
              {t.legal.related}
            </Text>
            {others.map((k) => (
              <Link key={k} href={HREF[k]()} className={cn(refLink.link, "text-label font-550")}>
                {legalDocs[locale][k].title}
              </Link>
            ))}
          </nav>
        </Stack>
      </Container>
    </>
  );
}
