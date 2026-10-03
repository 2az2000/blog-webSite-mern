import type { Metadata } from "next";

import { Stack, Text, Wordmark } from "@/components/primitives";

import { AuthScreens } from "./auth-screens";

/* Account — blog-refrence/auth.html (sign in, sign up, forgot, reset, verify). */

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to NOVA or create a free account.",
};

export default function AuthPage() {
  return (
    <div className="grid min-h-[calc(100vh-var(--spacing-header))] grid-cols-2 max-lg:min-h-0 max-lg:grid-cols-1">
      {/* .auth-aside — the brand column; gone below 1024px */}
      <aside className="grid content-center gap-6 bg-ink p-16 text-on-ink max-lg:hidden">
        <Wordmark />
        <blockquote className="font-serif text-h3 leading-130 fa:leading-160">
          “Ideas, stories, and perspectives shaping tomorrow.”
        </blockquote>
        <Text tone="soft" measure="short">
          An account is free. It gives you five articles a month, the Dispatch, and the ability to comment. Nothing is
          required to read the homepage.
        </Text>
        <Stack as="ul" gap={12} mt={16} className="text-body-sm leading-160 text-inherit opacity-72">
          <li>Five articles a month, any section</li>
          <li>The NOVA Dispatch, twice a week</li>
          <li>Comment once your email is verified</li>
        </Stack>
        <Text variant="meta" tone="soft" mt={32}>
          We never sell reader data. Read the privacy notice before you sign up if that matters to you — it should.
        </Text>
      </aside>

      {/* .auth-panel */}
      <div className="grid content-center justify-items-stretch px-12 py-16 max-md:px-6 max-md:py-8">
        <div className="mx-auto grid w-[min(26rem,100%)] gap-6">
          <AuthScreens />
        </div>
      </div>
    </div>
  );
}
