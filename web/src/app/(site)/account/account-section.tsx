"use client";

import type { ReactNode } from "react";

import { Panel } from "@/components/patterns/feedback";
import { Heading, Stack, Text } from "@/components/primitives";

/** One block of the settings page: a titled panel that is also an anchor target. */
export function Section({ id, title, lead, children }: { id: string; title: string; lead?: string; children: ReactNode }) {
  return (
    <Panel role="region" id={id} aria-labelledby={`${id}-title`} className="grid scroll-mt-24 gap-6">
      <Stack gap={8}>
        <Heading level={2} size="h3" id={`${id}-title`}>
          {title}
        </Heading>
        {lead && <Text tone="muted">{lead}</Text>}
      </Stack>
      {children}
    </Panel>
  );
}
