"use client";

import { Badge } from "@/components/primitives";
import { useI18n } from "@/i18n/i18n-provider";
import type { ArticleStatus } from "@/types/admin";

const VARIANT = { draft: "boxed", scheduled: "opinion", published: "default", archived: "boxed" } as const;

/** The state of an article in words, never in colour alone. */
export function StatusBadge({ status }: { status: ArticleStatus }) {
  const { t } = useI18n();
  return <Badge variant={VARIANT[status]}>{t.admin.status[status]}</Badge>;
}
