"use client";

import { notify } from "@/components/ui/sonner";
import { Button } from "@/components/primitives";
import { useI18n } from "@/i18n/i18n-provider";

/** 404 action: tell the newsroom about the broken link. */
export function ReportLinkButton() {
  const { t } = useI18n();
  return (
    <Button
      variant="ghost"
      onClick={() => {
        // TODO(api): POST { referrer: document.referrer, path: location.pathname } to the reporting endpoint.
        notify(t.notFound.reported, "success", { dismissLabel: t.a11y.dismiss });
      }}
    >
      {t.notFound.report}
    </Button>
  );
}
