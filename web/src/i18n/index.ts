import "server-only";

import { defaultLocale, type Locale } from "./config";
import { dictionaries, type Dictionary } from "./dictionaries";

/**
 * The active locale. There is one edition today; when the /[locale] segment
 * is introduced this becomes `(await params).locale` and nothing else changes.
 */
export async function getLocale(): Promise<Locale> {
  return defaultLocale;
}

export async function getDictionary(locale?: Locale): Promise<Dictionary> {
  return dictionaries[locale ?? (await getLocale())];
}

export type { Dictionary, Locale };
