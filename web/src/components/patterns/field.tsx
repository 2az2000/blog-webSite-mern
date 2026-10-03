"use client";

import { useId, type ReactNode } from "react";

import { FieldControlContext, IconAlert, refLink } from "@/components/primitives";
import { cn } from "@/lib/utils";

/*
 * Field (reference nova.css §7 .field): label, hint, error and one control, wired
 * together. The control (Input, Textarea from primitives) reads its id,
 * aria-describedby and aria-invalid from FieldControlContext.
 *
 *   <Field label="Email address" required error={errors.email?.message}>
 *     <Input type="email" {...register("email")} />
 *   </Field>
 *
 * Errors name the cause and the remedy, and sit next to the field.
 */

export function Field({
  label,
  required,
  requiredLabel,
  hint,
  error,
  success,
  id: idProp,
  className,
  labelClassName,
  children,
}: {
  label: ReactNode;
  required?: boolean;
  /** Visible "required" marker text — from the dictionary. */
  requiredLabel?: string;
  hint?: ReactNode;
  error?: ReactNode;
  success?: ReactNode;
  id?: string;
  className?: string;
  labelClassName?: string;
  children: ReactNode;
}) {
  const auto = useId();
  const id = idProp ?? `f${auto}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const msgId = error || success ? `${id}-msg` : undefined;
  const describedBy = [msgId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <FieldControlContext value={{ id, describedBy, invalid: Boolean(error) }}>
      <div className={cn("grid gap-2", className)}>
        <label
          htmlFor={id}
          className={cn("flex items-baseline gap-2 text-label font-semibold text-fg", labelClassName)}
        >
          {label}
          {required && (
            <span className="text-caption text-error" aria-hidden="true">
              {requiredLabel}
            </span>
          )}
        </label>
        {children}
        {hint && !error && (
          <p className="text-caption text-meta" id={hintId}>
            {hint}
          </p>
        )}
        {error ? (
          <p
            id={msgId}
            className="flex items-start gap-2 text-caption font-medium text-error [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:flex-none"
          >
            <IconAlert />
            <span>{error}</span>
          </p>
        ) : (
          success && (
            <p className="text-caption font-medium text-success" id={msgId}>
              {success}
            </p>
          )
        )}
      </div>
    </FieldControlContext>
  );
}

/**
 * Submit-time summary (reference `.form-error-summary`): announced as an
 * alert, each entry moves focus to its field.
 */
export function FormErrorSummary({ title, items }: { title: ReactNode; items: { id: string; label: ReactNode }[] }) {
  if (!items.length) return null;
  return (
    <div role="alert" className="grid gap-2 rounded-md border border-s-3 border-error bg-error-wash p-4">
      <h4 className="font-sans text-label text-error">{title}</h4>
      <ul className="grid list-none gap-1 text-caption">
        {items.map((item) => (
          <li key={item.id}>
            {/* classless in the reference: base underline + accent hover, error colour */}
            <a href={`#${item.id}`} className={cn(refLink.link, "text-error")}>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
