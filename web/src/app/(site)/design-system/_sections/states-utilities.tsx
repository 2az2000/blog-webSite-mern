import { EmptyState, SkeletonCard } from "@/components/patterns/feedback";
import { SpecLedger } from "@/components/patterns/ledger";
import { SecHead } from "@/components/patterns/sec-head";
import { ButtonLink, CardGrid, Code, Container, Heading, Section } from "@/components/primitives";
import { routes } from "@/config/routes";
import type { Locale } from "@/i18n/config";

/* design-system.html §08 states, §09 utility layer. */

export function StatesUtilitiesSections({ locale }: { locale: Locale }) {
  return (
    <>
      <Section aria-labelledby="states-title">
        <Container>
          <SecHead
            index={8}
            id="states-title"
            locale={locale}
            title="States"
            link={{ label: "Full state catalogue", href: routes.states() }}
          />
          <Heading level={3} size="h4" mb={16}>
            Skeletons match the editorial shape they replace
          </Heading>
          <CardGrid cols={3} gap={32}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </CardGrid>

          <Heading level={3} size="h4" mt={64} mb={16}>
            Empty
          </Heading>
          <EmptyState
            title="Nothing saved yet"
            actions={
              <>
                <ButtonLink href={routes.home()}>Browse the front page</ButtonLink>
                <ButtonLink href={routes.trending()} variant="secondary">
                  See what is trending
                </ButtonLink>
              </>
            }
          >
            Every empty state names the reason and offers the next action. None of them is a blank screen.
          </EmptyState>
        </Container>
      </Section>

      <Section aria-labelledby="util-title">
        <Container>
          <SecHead
            index={9}
            id="util-title"
            locale={locale}
            weight="quiet"
            title="The utility layer"
            note={
              <>
                A closed, named set — section 21 of the stylesheet. These are the only classes allowed to carry layout
                values in markup, which is what keeps <Code>style</Code> attributes out of the pages.
              </>
            }
          />
          <SpecLedger
            as="dl"
            rows={[
              [".col-3 … .col-12", "Column spans on .grid12; all collapse to 12 below 768px", "8"],
              [".row-gap-24 … -64", "Row gap on a grid band", "3"],
              [".stack / .stack-8 … -48", "Vertical rhythm in markup", "6"],
              [".row + .row--between/center/end/top/bottom/baseline", "Horizontal composition", "7"],
              [".gap-4 … .gap-64", "Drives CSS gap and the OD primitive variable together", "8"],
              [".mt-8 … .mt-64 / .mb-8 … .mb-48", "Single-axis spacing on the token scale", "12"],
              [".measure / -wide / -mid / -short / -long / -note", "Line-length caps", "6"],
              [".t-lead / -display / -h1 … -h4 / -index / -body-sm / -serif", "Type roles, not size overrides", "10"],
              [".t-accent / -muted / -fg / -inherit / -soft", "Semantic colour roles", "5"],
              [".ruled-top / -under / -row", "Rules used as structure", "3"],
              [".cols-1 … .cols-4", "Card row columns", "4"],
              [".big-num (+ --xl / --sm / --muted / --warning / --error)", "Display numerals for states and 404", "6"],
              [".frame + ratio modifiers", "Signature S5 — see section 05", "7"],
              [".full-bleed / .flush / .h-full / .scroll-x / .no-underline", "Escape hatches, deliberately few", "5"],
            ]}
          />
        </Container>
      </Section>
    </>
  );
}
