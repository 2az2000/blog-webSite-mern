import { Panel } from "@/components/patterns/feedback";
import { ChartNote } from "@/components/patterns/blocks";
import { LedgerList, LedgerRow, SpecLedger } from "@/components/patterns/ledger";
import { SecHead } from "@/components/patterns/sec-head";
import {
  CardGrid,
  Code,
  Col,
  Container,
  Grid,
  Heading,
  Section,
  Stack,
  Text,
  Wordmark,
} from "@/components/primitives";
import type { Locale } from "@/i18n/config";

import { Swatches } from "./swatches";

/* design-system.html §01–§04 · Brand, Typography, Colour, Spacing / grid / radius / elevation / motion. */

const PRINCIPLES: [string, string][] = [
  [
    "Paper, not product.",
    "The surface language is hairline rules and generous whitespace. Cards have no chrome; separation comes from a rule, a gap, or a change of ground.",
  ],
  ["Typography carries the hierarchy.", "Size, weight, family and space do the ranking. Borders, shadows and colour do not."],
  [
    "Accent is punctuation.",
    "Electric blue marks links, section indices and the primary action. A page with three blue elements is correct; a page with thirty is broken.",
  ],
  [
    "One dominant story per screen.",
    "The lead step of the type scale appears once. If two things are the biggest, neither is.",
  ],
  [
    "Dark mode is authored, not inverted.",
    "Its surfaces, borders and accent were chosen against a dark ground and audited separately.",
  ],
];

/* The specimen line for each role, set in that role. t-h1…t-h4 + t-serif carry no weight of their own. */
const TYPE: [label: string, spec: string, className: string][] = [
  ["Lead", "Newsreader 600 · 40 → 64px · 1.02 · −0.028em", "font-serif text-lead leading-lead font-semibold tracking-lead text-balance"],
  ["Display", "Newsreader 600 · 48 → 72px · 1.02 · −0.022em", "font-serif text-display leading-display font-semibold tracking-display text-balance"],
  ["H1", "Newsreader 600 · 36 → 56px · 1.06 · −0.018em", "font-serif text-h1 leading-h1 tracking-h1"],
  ["H2", "Newsreader 600 · 28 → 40px · 1.10 · −0.014em", "font-serif text-h2 leading-h2 tracking-h2"],
  ["H3", "Newsreader 600 · 24 → 32px · 1.18 · −0.011em", "font-serif text-h3 leading-h3 tracking-h3"],
  ["H4", "Newsreader 600 · 19 → 22px · 1.28 · −0.006em", "font-serif text-h4 leading-h4 tracking-h4"],
  ["Body large", "Inter 400 · 20px · 1.6", "max-w-measure text-body-lg leading-160 text-fg-soft"],
  ["Body", "Inter 400 · 18px · 1.7 — the article measure", ""],
  ["Body small", "Inter 400 · 16px · 1.6", "text-body-sm leading-160 text-fg-soft"],
  ["Caption", "Inter 400 · 14px · 1.4 — metadata and captions", "text-caption leading-tight text-meta"],
  ["Overline", "Inter 650 · 12px · 0.13em · uppercase", "font-sans text-overline leading-120 font-650 tracking-overline uppercase fa:leading-160"],
  ["Index", "Mono 500 · 11px · 0.1em · uppercase · tabular", "font-mono text-index tracking-index uppercase tabular-nums"],
];

const SPACE = [4, 8, 12, 16, 24, 32, 48, 64, 80, 96, 128];
/* the reference's --r-0 … --r-full, and the theme token each one is today */
const RADII = [
  ["0", "none"],
  ["2", "xs"],
  ["4", "md"],
  ["8", "xl"],
  ["full", "full"],
] as const;

const H4 = ({ children, mb = 16, mt }: { children: React.ReactNode; mb?: 16; mt?: 64 }) => (
  <Heading level={3} size="h4" mb={mb} mt={mt}>
    {children}
  </Heading>
);

export function FoundationsSections({ locale }: { locale: Locale }) {
  return (
    <>
      {/* 01 · Brand */}
      <Section aria-labelledby="brand-title">
        <Container>
          <SecHead index={1} id="brand-title" locale={locale} weight="major" title="Brand" />
          <Grid rowGap={48}>
            <Col span={4}>
              <Wordmark />
              <Text variant="meta" mt={16} measure="short">
                The wordmark is set in the editorial serif at 600, letter-spaced tight. It is never outlined, gradiented,
                rotated or set in the sans.
              </Text>
            </Col>
            <Col span={8}>
              <Stack as="ul" gap={16} className="max-w-ch-62">
                {PRINCIPLES.map(([head, body]) => (
                  <li key={head}>
                    <strong className="text-fg">{head}</strong> {body}
                  </li>
                ))}
              </Stack>
            </Col>
          </Grid>
        </Container>
      </Section>

      {/* 02 · Typography */}
      <Section aria-labelledby="type-title">
        <Container>
          <SecHead
            index={2}
            id="type-title"
            locale={locale}
            title="Typography"
            note="Newsreader carries Display → H4; Inter carries Body → Label. Family is the second axis of separation, so a featured card and a standard card never read as the same rank."
          />
          <LedgerList as="div">
            {TYPE.map(([label, spec, cls]) => (
              <LedgerRow
                key={label}
                num={null}
                body={
                  <>
                    <span className={cls}>{label} — the quiet revolution</span>
                    <span className="flex flex-wrap items-center gap-x-0 gap-y-2 font-sans text-caption leading-tight text-meta tabular-nums">
                      <span>{spec}</span>
                    </span>
                  </>
                }
              />
            ))}
          </LedgerList>

          <H4 mt={64}>Reading measure</H4>
          <Panel variant="sunk">
            <p className="mx-auto max-w-measure text-body leading-body text-fg-soft">
              This paragraph is set at the article measure: <Code>--measure</Code>, 39rem, which lands at roughly 69
              characters per line at the 18px body size — inside the 60–75 band the brief asks for. Long-form figures and
              annotations use <Code>--measure-wide</Code> at 46rem and reach past the column through a single{" "}
              <Code>--outset</Code> variable rather than through per-figure margins.
            </p>
          </Panel>
        </Container>
      </Section>

      {/* 03 · Colour */}
      <Section aria-labelledby="colour-title">
        <Container>
          <SecHead
            index={3}
            id="colour-title"
            locale={locale}
            title="Colour"
            note="Semantic tokens only — no page names a hex. Switch the theme in the header to audit the dark values; they are authored independently, not derived."
          />
          <Swatches />
          <ChartNote className="mt-8">
            Body text measures 5.7:1 on paper at <Code>--muted</Code> <Code>#5C5A55</Code>. Phase 1 used the brief&apos;s{" "}
            <Code>#737373</Code>, which measures 4.2:1 — under the 4.5 floor — so it was deepened and the change recorded
            here rather than left silent.
          </ChartNote>
        </Container>
      </Section>

      {/* 04 · Spacing, grid, radius, elevation, motion */}
      <Section aria-labelledby="space-title">
        <Container>
          <SecHead index={4} id="space-title" locale={locale} title="Spacing, grid, radius, elevation, motion" />
          <Grid rowGap={48}>
            <Col span={6}>
              <H4>Spacing scale</H4>
              <Text variant="meta" mb={16}>
                Multiples of 4 and 8 only. There is no 17, 23 or 37 anywhere in the stylesheet.
              </Text>
              <Stack gap={8}>
                {SPACE.map((n) => (
                  /* .spec-row: two columns, three children — the third wraps under the first */
                  <div
                    key={n}
                    className="grid grid-cols-spec items-baseline gap-6 border-t border-border py-4 *:min-w-0"
                  >
                    <Text as="span" variant="index">
                      --s-{n}
                    </Text>
                    {/* .spec-bar: the reference ships no CSS for it, so the bar is an empty box. The width is the value documented. */}
                    <span aria-hidden="true" style={{ width: n }} />
                    <span className="text-end font-mono text-caption whitespace-nowrap text-meta">{n}px</span>
                  </div>
                ))}
              </Stack>
            </Col>

            <Col span={6}>
              <H4>Grid &amp; containers</H4>
              <SpecLedger
                as="dl"
                rows={[
                  ["--content-max", "The 12-column editorial grid", "1280px"],
                  ["--content-wide", "Full-bleed bands and the long-form hero", "1440px"],
                  ["--page-gutter", "80 → 48 → 40 → 24 → 20px by breakpoint", "80px"],
                  ["--col-gap", "Column gutter", "24px"],
                  ["--measure", "Article column — ≈ 69 characters", "39rem"],
                  ["--measure-wide", "Long-form figures and annotations", "46rem"],
                  ["Breakpoints", "1440 · 1280 · 1024 · 768 · 480 · 390", "6"],
                ]}
              />
            </Col>

            <Col span={6}>
              <H4>Radius</H4>
              <Text variant="meta" mb={16}>
                Editorial and near-square. 8px is the ceiling; <Code>--r-full</Code> exists only for pills and avatars.
                The Phase 1 12/16/24 steps were documented but unused, and are gone.
              </Text>
              <CardGrid cols={4} gap={16}>
                {RADII.map(([r, token]) => (
                  <Stack key={r} gap={8}>
                    {/* .spec-radius: no CSS in the reference either — an empty box */}
                    <span aria-hidden="true" style={{ borderRadius: `var(--radius-${token})` }} />
                    <Text as="span" variant="index">
                      --r-{r}
                    </Text>
                  </Stack>
                ))}
              </CardGrid>
            </Col>

            <Col span={6}>
              <H4>Elevation</H4>
              <Text variant="meta" mb={16}>
                Two shadows, both functional: a raised surface and an overlay. Surfaces are separated by rules first.
              </Text>
              <CardGrid cols={2} gap={16}>
                <Panel variant="elevated">
                  <Text variant="index">--shadow-raised</Text>
                  <Text variant="meta" mt={8}>
                    Sticky header, panels on paper
                  </Text>
                </Panel>
                <Panel className="shadow-overlay">
                  <Text variant="index">--shadow-overlay</Text>
                  <Text variant="meta" mt={8}>
                    Modals, dropdown menus, toasts
                  </Text>
                </Panel>
              </CardGrid>
            </Col>

            <Col span={12}>
              <H4>Motion</H4>
              <Text variant="meta" mb={16} measure="long">
                Micro-interactions run 120–240ms, larger transitions 360ms, all on <Code>--ease-out</Code> entering and{" "}
                <Code>--ease-in</Code> leaving. Every motion in the product is suppressed under{" "}
                <Code>prefers-reduced-motion</Code>, including the card image zoom and the topic-tile scale.
              </Text>
              <SpecLedger
                as="div"
                rows={[
                  ["--dur-micro", "Colour and opacity changes", "120ms"],
                  ["--dur-fast", "Hover, focus, small reveals", "180ms"],
                  ["--dur-normal", "Header transform, theme change", "240ms"],
                  ["--dur-slow", "Card image zoom", "360ms"],
                  ["--ease-out", "cubic-bezier(.16, 1, .3, 1) — entering", "enter"],
                  ["--ease-in", "cubic-bezier(.4, 0, 1, 1) — leaving", "exit"],
                  ["prefers-reduced-motion", "All of the above reduced to 0.01ms", "honoured"],
                ]}
              />
            </Col>
          </Grid>
        </Container>
      </Section>
    </>
  );
}

