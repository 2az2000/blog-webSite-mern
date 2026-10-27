"use client";

import { useState } from "react";

import { Button, Cluster, IconArrowDown, IconArrowUp, IconClose, Select, Stack, Text } from "@/components/primitives";
import { useI18n } from "@/i18n/i18n-provider";
import type { BodyBlock } from "@/types/content";

import { BLANK_BLOCK, BLOCK_FIELDS, BLOCK_TYPES, type BlockType, type Obj } from "./field-schema";
import { FieldsEditor } from "./fields-editor";

/** A body block with a stable identity, so reordering never remounts (and never loses) a form. */
export type KeyedBlock = { key: string; block: BodyBlock };

let counter = 0;
export const keyed = (block: BodyBlock): KeyedBlock => ({ key: `b${(counter += 1)}`, block });

/** The ordered list of blocks: add, edit, move, remove. */
export function BlockEditor({
  blocks,
  onChange,
  disabled,
}: {
  blocks: KeyedBlock[];
  onChange: (next: KeyedBlock[]) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const [adding, setAdding] = useState<BlockType>("p");
  const names = t.admin.blocks as Record<string, string>;

  const move = (i: number, to: number) => {
    const next = [...blocks];
    const [item] = next.splice(i, 1);
    next.splice(to, 0, item!);
    onChange(next);
  };

  return (
    <Stack gap={24}>
      {blocks.length === 0 && <Text tone="muted">{t.admin.body.empty}</Text>}

      <ol className="grid list-none gap-6 p-0">
        {blocks.map(({ key, block }, i) => (
          <li key={key} className="grid gap-4 rounded-md border border-border bg-surface p-6 max-md:p-4">
            <Cluster justify="between" gap={8}>
              <Text variant="eyebrow" tone="muted" as="span">
                {t.admin.body.block(String(i + 1), names[block.type] ?? block.type)}
              </Text>
              <Cluster gap={4} wrap={false}>
                <Button variant="ghost" size="sm" aria-label={t.admin.body.moveUp} disabled={disabled || i === 0} onClick={() => move(i, i - 1)}>
                  <IconArrowUp />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={t.admin.body.moveDown}
                  disabled={disabled || i === blocks.length - 1}
                  onClick={() => move(i, i + 1)}
                >
                  <IconArrowDown />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={t.admin.body.remove}
                  disabled={disabled}
                  onClick={() => onChange(blocks.filter((b) => b.key !== key))}
                >
                  <IconClose />
                </Button>
              </Cluster>
            </Cluster>
            <FieldsEditor
              idBase={key}
              fields={BLOCK_FIELDS[block.type]}
              value={block as unknown as Obj}
              disabled={disabled}
              onChange={(next) => onChange(blocks.map((b) => (b.key === key ? { key, block: next as unknown as BodyBlock } : b)))}
            />
          </li>
        ))}
      </ol>

      <Cluster gap={8}>
        <Select aria-label={t.admin.body.add} value={adding} disabled={disabled} onChange={(e) => setAdding(e.target.value as BlockType)} className="w-auto">
          {BLOCK_TYPES.map((type) => (
            <option key={type} value={type}>
              {names[type]}
            </option>
          ))}
        </Select>
        <Button variant="secondary" disabled={disabled} onClick={() => onChange([...blocks, keyed(structuredClone(BLANK_BLOCK[adding]))])}>
          {t.admin.body.add}
        </Button>
      </Cluster>
    </Stack>
  );
}
