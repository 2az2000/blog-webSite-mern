import type { Locale } from "../config";
import en, { type Dictionary } from "./en";
import fa from "./fa";

/**
 * Universal (server + client) access to UI copy. Shared presentational
 * components that must stay Server-Component-friendly take a `locale` prop
 * and read from here; Client Components use `useI18n()`; pages and layouts
 * use `getDictionary()`.
 */
export const dictionaries: Record<Locale, Dictionary> = { fa, en };

export type { Dictionary };
