import type { Metadata } from "next";

import { Container, Heading, Stack, Text } from "@/components/primitives";

import { ConfirmScreen } from "../token-screens";

export const metadata: Metadata = {
  title: "Confirm your subscription",
  // a link with a key in it is nobody else's business
  robots: { index: false, follow: false },
};

export default async function ConfirmPage({ searchParams }: PageProps<"/newsletter/confirm">) {
  const raw = (await searchParams).token;
  const token = typeof raw === "string" ? raw : "";
  return (
    <Container narrow className="py-16">
      <Stack gap={24} className="mx-auto max-w-panel">
        <Stack gap={8}>
          <Text variant="eyebrow" tone="accent">
            The NOVA Dispatch
          </Text>
          <Heading level={1} size="h1">
            Confirm your subscription
          </Heading>
          <Text tone="muted">One click from the e-mail we sent, and the Dispatch starts arriving.</Text>
        </Stack>
        <ConfirmScreen token={token} />
      </Stack>
    </Container>
  );
}
