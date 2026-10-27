"use client";

import { useState } from "react";

import { Field } from "@/components/patterns/field";
import { Button, Checkbox, Cluster, IconClose, Input, Select, Stack, Textarea } from "@/components/primitives";
import { notify } from "@/components/ui/sonner";
import { useI18n } from "@/i18n/i18n-provider";
import { ApiError } from "@/lib/api";
import { IMAGE_TYPES, ImageRejected, MAX_IMAGE_MB, uploadImage } from "@/lib/admin-api";

import { blankRow, isEmptyValue, RICH_KEYS, type FieldDef, type Obj } from "./field-schema";

/*
 * One generic form for any {key: value} object described by a FieldDef list:
 * block bodies, page copy, and the rows nested inside them. Optional fields
 * that are emptied leave the saved object entirely, because the API rejects
 * `""` where it expects an enum or a slug.
 */

type Props = {
  fields: readonly FieldDef[];
  value: Obj;
  onChange: (next: Obj) => void;
  disabled?: boolean;
  /** Prefix that keeps element ids unique when several editors share a page. */
  idBase: string;
};

export function FieldsEditor({ fields, value, onChange, disabled, idBase }: Props) {
  const { t } = useI18n();
  const labels = t.admin.fields as Record<string, string>;

  const set = (patch: Obj) => {
    const next: Obj = { ...value, ...patch };
    for (const f of fields) if (f.optional && isEmptyValue(next[f.key])) delete next[f.key];
    onChange(next);
  };

  return (
    <Stack gap={16}>
      {fields.map((f) => {
        const id = `${idBase}-${f.key}`;
        const label = labels[f.key] ?? f.key;
        const hint = f.kind === "area" && RICH_KEYS.has(f.key) ? t.admin.body.richHint : undefined;
        const v = value[f.key];

        switch (f.kind) {
          case "check":
            return (
              <Checkbox
                key={f.key}
                id={id}
                label={label}
                checked={Boolean(v)}
                disabled={disabled}
                onChange={(e) => set({ [f.key]: e.target.checked })}
              />
            );
          case "rows":
            return (
              <Rows
                key={f.key}
                id={id}
                label={label}
                def={f}
                rows={(Array.isArray(v) ? v : []) as Obj[]}
                disabled={disabled}
                onChange={(rows) => set({ [f.key]: rows })}
              />
            );
          case "image":
            return (
              <ImageField
                key={f.key}
                id={id}
                label={label}
                src={String(v ?? "")}
                disabled={disabled}
                alt={String(value.alt ?? "")}
                decorative={value.decorative === true}
                credit={String(value.credit ?? "")}
                onChange={(src, size) => set({ [f.key]: src, ...(size && "width" in value ? size : {}) })}
              />
            );
          case "lines":
            return (
              <Field key={f.key} id={id} label={label}>
                <Lines value={Array.isArray(v) ? (v as string[]) : []} disabled={disabled} onChange={(lines) => set({ [f.key]: lines })} />
              </Field>
            );
          case "area":
            return (
              <Field key={f.key} id={id} label={label} hint={hint}>
                <Textarea value={String(v ?? "")} disabled={disabled} onChange={(e) => set({ [f.key]: e.target.value })} />
              </Field>
            );
          case "number":
            return (
              <Field key={f.key} id={id} label={label}>
                <Input type="number" min={0} value={typeof v === "number" ? v : ""} disabled={disabled} onChange={(e) => set({ [f.key]: Number(e.target.value) })} />
              </Field>
            );
          case "date":
            return (
              <Field key={f.key} id={id} label={label}>
                <Input type="date" value={String(v ?? "")} disabled={disabled} onChange={(e) => set({ [f.key]: e.target.value })} />
              </Field>
            );
          case "select":
            return (
              <Field key={f.key} id={id} label={label}>
                <Select value={String(v ?? "")} disabled={disabled} onChange={(e) => set({ [f.key]: e.target.value })}>
                  {f.optional && <option value="" />}
                  {f.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </Select>
              </Field>
            );
          default:
            return (
              <Field key={f.key} id={id} label={label} hint={hint}>
                <Input value={String(v ?? "")} disabled={disabled} onChange={(e) => set({ [f.key]: e.target.value })} />
              </Field>
            );
        }
      })}
    </Stack>
  );
}

/** One line per item. Typing keeps its own text, so a trailing newline is not eaten. */
function Lines({ value, onChange, disabled }: { value: string[]; onChange: (lines: string[]) => void; disabled?: boolean }) {
  const [text, setText] = useState(value.join("\n"));
  return (
    <Textarea
      value={text}
      disabled={disabled}
      onChange={(e) => {
        setText(e.target.value);
        onChange(e.target.value.split("\n").map((l) => l.trim()).filter(Boolean));
      }}
    />
  );
}

function Rows({
  id,
  label,
  def,
  rows,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  def: Extract<FieldDef, { kind: "rows" }>;
  rows: Obj[];
  disabled?: boolean;
  onChange: (rows: Obj[]) => void;
}) {
  const { t } = useI18n();
  return (
    <fieldset className="grid gap-4 border-0 p-0">
      <legend className="mb-2 text-label font-semibold text-fg">{label}</legend>
      {rows.map((row, i) => (
        <div key={i} className="grid gap-4 rounded-md border border-border bg-surface-sunk p-4">
          <FieldsEditor
            idBase={`${id}-${i}`}
            fields={def.sub}
            value={row}
            disabled={disabled}
            onChange={(next) => onChange(rows.map((r, j) => (j === i ? next : r)))}
          />
          <Button variant="ghost" size="sm" disabled={disabled} onClick={() => onChange(rows.filter((_, j) => j !== i))}>
            <IconClose />
            {t.admin.body.removeRow}
          </Button>
        </div>
      ))}
      <Button variant="secondary" size="sm" disabled={disabled} onClick={() => onChange([...rows, blankRow(def.sub)])}>
        {t.admin.body.addRow}
      </Button>
    </fieldset>
  );
}

/** An image address, or a file sent straight to the media host with API-signed parameters. */
function ImageField({
  id,
  label,
  src,
  alt,
  decorative,
  credit,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  src: string;
  alt: string;
  decorative: boolean;
  credit: string;
  disabled?: boolean;
  onChange: (src: string, size?: { width: number; height: number }) => void;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  // the library takes no picture without a description (or an explicit "decorative")
  const described = decorative || alt.trim() !== "";

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const image = await uploadImage(file, { alt, credit, decorative });
      onChange(image.url, { width: image.width, height: image.height });
    } catch (err) {
      const u = t.admin.editor.upload;
      notify(
        err instanceof ImageRejected
          ? err.reason === "type"
            ? u.badType
            : u.tooBig(String(MAX_IMAGE_MB))
          : err instanceof ApiError && err.status === 503
            ? u.unavailable
            : u.failed,
        "error",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Field id={id} label={label} hint={described ? undefined : t.admin.editor.upload.needAlt}>
      <Cluster gap={8} wrap={false}>
        <Input value={src} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
        <Button variant="secondary" size="sm" loading={busy} disabled={disabled || !described} asChild>
          <label>
            {busy ? t.admin.editor.upload.uploading : t.admin.editor.upload.choose}
            <input
              type="file"
              className="sr-only"
              disabled={disabled || busy || !described}
              accept={IMAGE_TYPES.join(",")}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void upload(file);
              }}
            />
          </label>
        </Button>
      </Cluster>
    </Field>
  );
}
