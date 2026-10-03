"use client";

import { createContext, use, type ReactNode } from "react";

import type { Locale } from "./config";
import { dictionaries, type Dictionary } from "./dictionaries";

// Dictionaries hold functions, which cannot cross the server → client
// boundary as props, so the provider receives the locale and resolves the
// dictionary on the client side of the boundary.

type I18nValue = { locale: Locale; t: Dictionary };

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <I18nContext value={{ locale, t: dictionaries[locale] }}>{children}</I18nContext>;
}

/** UI copy for Client Components. Server Components use `getDictionary()` instead. */
export function useI18n(): I18nValue {
  const value = use(I18nContext);
  if (!value) throw new Error("useI18n must be used inside <I18nProvider>.");
  return value;
}
