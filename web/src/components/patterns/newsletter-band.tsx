import type { ReactNode } from "react";

import { NewsletterForm } from "@/components/patterns/forms";
import { Container, Heading, Text } from "@/components/primitives";

/** .newsletter-band — the inverted sign-up band (reference nova.css §10, §18). */
export function NewsletterBand({
  id,
  eyebrow,
  title,
  lead,
  aside,
  form,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lead: string;
  /** Extra line under the lead (e.g. subscriber count). */
  aside?: ReactNode;
  form: React.ComponentProps<typeof NewsletterForm>;
}) {
  return (
    <section aria-labelledby={id} className="bg-ink py-20 text-on-ink">
      <Container className="grid grid-cols-band items-center gap-16 max-lg:grid-cols-1 max-lg:gap-8">
        <div>
          <Text variant="index" tone="accent">
            {eyebrow}
          </Text>
          <Heading level={2} id={id} mt={16} className="text-on-ink">
            {title}
          </Heading>
          <Text variant="intro" mt={16} className="text-on-ink/78">
            {lead}
          </Text>
          {aside}
        </div>
        <NewsletterForm {...form} />
      </Container>
    </section>
  );
}
