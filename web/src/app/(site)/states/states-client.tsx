"use client";

import { useState, type ReactNode } from "react";

import { notify } from "@/components/ui/sonner";
import { Button } from "@/components/primitives";
import { useI18n } from "@/i18n/i18n-provider";

/** Retry that fails honestly (reference data-retry). */
export function RetryButton({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  return (
    <Button
      size="sm"
      loading={loading}
      onClick={() => {
        setLoading(true);
        setTimeout(() => {
          setLoading(false);
          notify("Still unreachable — try again in a moment", "error", { dismissLabel: t.a11y.dismiss });
        }, 900);
      }}
    >
      {children}
    </Button>
  );
}

export function ToastDemo() {
  const { t } = useI18n();
  const opts = { dismissLabel: t.a11y.dismiss };
  return (
    <>
      <Button onClick={() => notify("Saved to your reading list", "success", opts)}>Show a success toast</Button>
      <Button variant="danger" onClick={() => notify("Could not save — you appear to be offline", "error", opts)}>
        Show an error toast
      </Button>
    </>
  );
}
