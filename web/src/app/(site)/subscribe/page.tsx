import type { Metadata } from "next";

import { Accordion, CategoryHero } from "@/components/patterns/blocks";
import { Notice } from "@/components/patterns/feedback";
import { Breadcrumbs } from "@/components/patterns/navigation";
import { SecHead } from "@/components/patterns/sec-head";
import { routes } from "@/config/routes";
import { Col, Container, Grid, Heading, Section, Text } from "@/components/primitives";
import { getDictionary, getLocale } from "@/i18n";
import { cn } from "@/lib/utils";

import { PlanPicker } from "./plan-picker";

/* Subscribe — blog-refrence/subscribe.html */

export const metadata: Metadata = {
  title: "Subscribe",
  description: "Journalism paid for by the people who read it. Free, Reader and Premium plans.",
};

type Cell = "yes" | "no" | string;

const COMPARE: [feature: string, free: Cell, reader: Cell, premium: Cell][] = [
  ["Articles per month", "5", "Unlimited", "Unlimited"],
  ["The NOVA Dispatch", "yes", "yes", "yes"],
  ["Long reads & investigations", "no", "yes", "yes"],
  ["Archive back to 2021", "no", "yes", "yes"],
  ["Saved articles & collections", "no", "yes", "yes"],
  ["Comments", "yes", "yes", "yes"],
  ["Published datasets", "no", "no", "yes"],
  ["Monthly desk briefing", "no", "no", "yes"],
  ["Annual print edition", "no", "no", "yes"],
  ["Gift subscriptions", "no", "no", "2 per year"],
];

const FAQ = [
  {
    q: "Can I cancel whenever I want?",
    a: "Yes, from account settings, in two clicks. Your access runs to the end of the period you have paid for, and we do not email you to ask why.",
  },
  {
    q: "What happens to my saved articles if I cancel?",
    a: "They stay in your account. You keep the list and can export it as a file; you simply lose access to the pieces that sit behind the paywall.",
  },
  {
    q: "Do you offer a student rate?",
    a: "£3 a month, on the honour system. Select it at checkout — there is nothing to upload and nobody checks.",
  },
  {
    q: "Is there a team or institutional rate?",
    a: "Yes, for newsrooms, universities and libraries. Contact the newsroom and we will work out something proportionate to your size.",
  },
  {
    q: "Will you sell my data?",
    a: "No. We do not run third-party advertising trackers, and reader data is never sold or shared for marketing. The privacy notice lists every processor we use.",
  },
];

/* .compare td: centred but the first column, ruled below */
const CELL = "border-b border-border px-3 py-4 text-center max-md:px-2 max-md:py-3";

function CompareCell({ value }: { value: Cell }) {
  if (value === "yes") return <td className={cn(CELL, "font-bold text-success")}>Yes</td>;
  if (value === "no") return <td className={cn(CELL, "text-muted-soft")}>No</td>;
  return <td className={cn(CELL, "whitespace-nowrap")}>{value}</td>;
}

export default async function SubscribePage() {
  const locale = await getLocale();
  const t = await getDictionary(locale);

  return (
    <>
      <CategoryHero image="/images/subscribe-hero.jpg" width={1600} height={1067}>
        <Breadcrumbs
          tone="photo"
          label={t.a11y.breadcrumb}
          items={[{ label: t.nav.home, href: routes.home() }, { label: "Subscribe" }]}
        />
        <Text variant="eyebrow" mt={24} mb={16} className="text-photo-brand">
          Reader-funded since 2021
        </Text>
        <Heading level={1} size="display" measure="short">
          Journalism paid for by the people who read it
        </Heading>
        <Text variant="intro" mt={24} className="text-paper/85">
          NOVA takes no advertising inside the edit and runs no sponsored articles. Subscriptions are the whole business
          model, which is why the reporting can take eleven months when it needs to.
        </Text>
      </CategoryHero>

      {/* PLANS */}
      <Section aria-labelledby="plans-title">
        <Container>
          <PlanPicker />
          <Notice tone="success" bareIcon className="mt-8 max-w-ch-62">
            <strong className="text-fg">Secure checkout.</strong> Payments are processed by our provider over TLS; NOVA never
            sees or stores your card details. Cancel from account settings in two clicks — no phone call, no retention
            offer.
          </Notice>
        </Container>
      </Section>

      {/* COMPARISON */}
      <Section aria-labelledby="compare-title">
        <Container>
          <SecHead index={2} id="compare-title" locale={locale} title="Compared side by side" />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-body-sm max-md:text-caption">
              <caption className="sr-only">Feature comparison across the Free, Reader and Premium plans</caption>
              <thead>
                <tr>
                  {["What you get", "Free", "Reader", "Premium"].map((h, i) => (
                    <th
                      key={h}
                      scope="col"
                      className={cn(
                        "border-b-2 border-fg px-3 py-4 text-overline tracking-overline text-meta uppercase max-md:px-2 max-md:py-3",
                        i === 0 ? "text-start" : "text-center",
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE.map(([feature, ...cells]) => (
                  <tr key={feature}>
                    <th scope="row" className="border-b border-border px-3 py-4 text-start max-md:px-2 max-md:py-3">
                      {feature}
                    </th>
                    {cells.map((c, i) => (
                      <CompareCell key={i} value={c} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      </Section>

      {/* WHERE THE MONEY GOES */}
      <Section aria-labelledby="why-title">
        <Grid container rowGap={32}>
          <Col span={5}>
            <SecHead index={3} id="why-title" locale={locale} title="Where the money goes" />
          </Col>
          <Col span={7}>
            <Text variant="intro">
              Roughly three quarters of subscription revenue pays reporters, editors and the freelance photography
              budget. The rest covers hosting, legal review for investigations, and the access-request fees that a story
              like the grid rebuild runs up over eleven months.
            </Text>
            <Text tone="muted" measure="long" mt={24}>
              We publish the full breakdown once a year, audited, alongside the number of subscribers. Both figures go up
              and down; we print them either way.
            </Text>
            <Text variant="meta" mt={24}>
              Figures described here are illustrative content for this prototype.
            </Text>
          </Col>
        </Grid>
      </Section>

      {/* FAQ */}
      <Section aria-labelledby="sfaq-title">
        <Container narrow>
          <SecHead index={4} id="sfaq-title" locale={locale} title="Before you subscribe" />
          <Accordion items={FAQ} />
        </Container>
      </Section>
    </>
  );
}
