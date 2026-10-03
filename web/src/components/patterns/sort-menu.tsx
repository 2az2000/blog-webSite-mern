"use client";

import { Button } from "@/components/primitives";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type SortOption<K extends string> = { key: K; label: string };

/** Reference `.dropdown` sort control: "Sort: Relevance ▾" with a radio menu. */
export function SortMenu<K extends string>({
  label,
  options,
  value,
  onChange,
  variant = "ghost",
  menuLabel,
  className,
}: {
  label: string;
  options: SortOption<K>[];
  value: K;
  onChange: (key: K) => void;
  variant?: "ghost" | "secondary";
  /** Accessible name of the menu, when it differs from the trigger label. */
  menuLabel?: string;
  className?: string;
}) {
  const current = options.find((o) => o.key === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size="sm" className={className}>
          {label}: <span>{current?.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent aria-label={menuLabel ?? label}>
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as K)}>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.key} value={o.key}>
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
