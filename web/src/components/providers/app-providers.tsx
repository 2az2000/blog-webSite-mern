"use client";

import { useEffect, type ReactNode } from "react";
import { Direction } from "radix-ui";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { localeMeta, type Locale } from "@/i18n/config";
import { I18nProvider } from "@/i18n/i18n-provider";
import { useBookmarks } from "@/stores/bookmarks-store";

/**
 * Every client-side context the app needs, in one place, mounted once by the
 * root layout. Server Components pass straight through `children`.
 */
export function AppProviders({ locale, children }: { locale: Locale; children: ReactNode }) {
  const dir = localeMeta[locale].dir;

  // Persisted client stores load after hydration so server and client HTML match.
  useEffect(() => {
    void useBookmarks.persist.rehydrate();
  }, []);

  return (
    <I18nProvider locale={locale}>
      {/* Radix reads direction from here: arrow keys, menu alignment, tab order. */}
      <Direction.Provider dir={dir}>
        <TooltipProvider>
          {children}
          <Toaster dir={dir} />
        </TooltipProvider>
      </Direction.Provider>
    </I18nProvider>
  );
}
