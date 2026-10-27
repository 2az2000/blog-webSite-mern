"use client";

import { notify } from "@/components/ui/sonner";
import { Button } from "@/components/primitives";
import { useI18n } from "@/i18n/i18n-provider";
import { reportBrokenLink } from "@/lib/reader-api";

/** 404 action: tell the newsroom about the broken link. */
export function ReportLinkButton() {
  const { t } = useI18n();
  return (
    <Button
      variant="ghost"
      onClick={() => {
        // the page the reader was sent to is the one that is broken; where they came from is how we find the bad link
        reportBrokenLink(location.pathname, document.referrer || undefined).catch(() => undefined);
        notify(t.notFound.reported, "success", { dismissLabel: t.a11y.dismiss });
      }}
    >
      {t.notFound.report}
    </Button>
  );
}
