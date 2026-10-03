"use client";

import { createContext, use, type ComponentProps, type ReactNode } from "react";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
 * Form controls — reference nova.css §7 (.input, .textarea, .checkbox) and
 * the ink-band treatment from §10 (.newsletter-form .input).
 * Inside a <Field> they pick up id, aria-describedby and aria-invalid from
 * FieldControlContext; the error look keys on aria-invalid
 * (reference .field.is-error .input). Outside a Field they are plain controls.
 */

export type FieldControl = { id: string; describedBy?: string; invalid: boolean };

export const FieldControlContext = createContext<FieldControl | null>(null);

function useControl(id?: string) {
  const ctx = use(FieldControlContext);
  return {
    id: id ?? ctx?.id,
    "aria-describedby": ctx?.describedBy,
    "aria-invalid": ctx?.invalid || undefined,
  };
}

const control = cva(
  [
    "min-h-12 w-full rounded-md border border-strong bg-surface px-4 py-3 font-sans text-body-sm leading-150 text-fg",
    "transition-[border-color,box-shadow] duration-180 ease-in-out",
    "placeholder:text-muted-soft hover:border-fg-soft",
    "focus:border-brand focus:shadow-focus focus:outline-none",
    "disabled:cursor-not-allowed disabled:bg-surface-sunk disabled:text-muted-soft",
    "aria-invalid:border-error aria-invalid:focus:shadow-focus-error",
  ],
  {
    variants: {
      /** On the theme's ink band (newsletter band). */
      tone: {
        default: "",
        ink: "border-on-ink/35 bg-transparent text-on-ink placeholder:text-on-ink/55",
      },
      /** Codes and tokens (verification code) are typed in the index face. */
      mono: { true: "font-mono tracking-index uppercase" },
      multiline: { true: "min-h-30 resize-y py-3" }, // .textarea
    },
    defaultVariants: { tone: "default" },
  },
);

type Tone = { /** Sits on the theme's ink band (newsletter band). */ tone?: "default" | "ink" };

export function Input({
  id,
  tone,
  mono,
  className,
  ...props
}: ComponentProps<"input"> & Tone & { mono?: boolean }) {
  return <input data-slot="input" {...useControl(id)} className={cn(control({ tone, mono }), className)} {...props} />;
}

export function Textarea({ id, tone, className, ...props }: ComponentProps<"textarea"> & Tone) {
  return (
    <textarea
      data-slot="textarea"
      {...useControl(id)}
      className={cn(control({ tone, multiline: true }), className)}
      {...props}
    />
  );
}

type ChoiceProps = Omit<ComponentProps<"input">, "type"> & Tone & { label: ReactNode };

/* .checkbox — the label is the hit target */
function Choice({ type, label, tone, className, ...props }: ChoiceProps & { type: "checkbox" | "radio" }) {
  return (
    <label
      className={cn(
        "flex items-start gap-3 text-caption",
        tone === "ink" ? "text-on-ink/70" : "text-meta",
        className,
      )}
    >
      <input type={type} className="m-0 size-5 flex-none" {...props} />
      <span>{label}</span>
    </label>
  );
}

export function Checkbox(props: ChoiceProps) {
  return <Choice type="checkbox" {...props} />;
}

export function Radio(props: ChoiceProps) {
  return <Choice type="radio" {...props} />;
}
