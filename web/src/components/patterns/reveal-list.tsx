"use client";

import { useState, type ReactNode } from "react";

import { SkeletonCard } from "@/components/patterns/feedback";
import { Button, CardGrid } from "@/components/primitives";
import { cn } from "@/lib/utils";

/**
 * "Load more" over server-rendered items (reference: index.html #loadMore).
 * The server renders every card; the client only decides how many are shown,
 * so cards stay Server Components and ship no JS.
 */
export function RevealList({
  items,
  initial,
  step,
  cols = 3,
  label,
  doneLabel,
  delay = 700,
  footerClassName = "mt-12 flex flex-wrap items-center justify-center gap-4",
}: {
  items: ReactNode[];
  initial: number;
  step: number;
  /** The items sit in a card row (.cards-row) of this many columns. */
  cols?: 1 | 2 | 3 | 4;
  label: string;
  /** Shown (disabled) once everything is visible. Omit to hide the button instead. */
  doneLabel?: string;
  delay?: number;
  footerClassName?: string;
}) {
  const [shown, setShown] = useState(Math.min(initial, items.length));
  const [loading, setLoading] = useState(false);
  const done = shown >= items.length;

  const more = () => {
    if (done || loading) return;
    setLoading(true);
    setTimeout(() => {
      setShown((n) => Math.min(n + step, items.length));
      setLoading(false);
    }, delay);
  };

  return (
    <>
      <CardGrid cols={cols}>
        {items.slice(0, shown)}
        {loading && <SkeletonCard />}
      </CardGrid>
      {!(done && !doneLabel) && (
        <div className={cn(footerClassName)}>
          <Button variant="secondary" loading={loading} aria-disabled={done || undefined} onClick={more}>
            {done ? doneLabel : label}
          </Button>
        </div>
      )}
    </>
  );
}
