import type { Metadata } from "next";

import { Container, Heading, Stack, Text } from "@/components/primitives";

import { ManageScreen } from "../token-screens";

export const metadata: Metadata = {
  title: "Your Dispatch",
  // a link with a key in it is nobody else's business
  robots: { index: false, follow: false },
};

export default async function ManagePage({ searchParams }: PageProps<"/newsletter/manage">) {
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
            Your Dispatch
          </Heading>
          <Text tone="muted">Change how often it comes and what it covers — or leave. No account needed.</Text>
        </Stack>
        <ManageScreen token={token} />
      </Stack>
    </Container>
  );
}
