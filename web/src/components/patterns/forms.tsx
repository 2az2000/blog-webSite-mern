"use client";

import { useId, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type FieldErrors, type FieldValues, type UseFormReturn } from "react-hook-form";
import { z } from "zod";

import { Panel } from "@/components/patterns/feedback";
import { Field, FormErrorSummary } from "@/components/patterns/field";
import { notify } from "@/components/ui/sonner";
import { Button, Checkbox, Heading, Input, Text } from "@/components/primitives";
import { useI18n } from "@/i18n/i18n-provider";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { fields, mockSubmit } from "@/lib/validation";

/*
 * Form behaviour from the reference (nova.js initForms):
 *   · validate on blur, re-validate while typing once a field is in error
 *   · on submit: error summary + focus the first bad field, or
 *   · loading button → success toast → reset (or reveal a success panel)
 */

export const formMode = { mode: "onBlur", reValidateMode: "onChange", shouldFocusError: true } as const;

/** The reference error summary, built from react-hook-form errors. */
export function ErrorSummary<T extends FieldValues>({
  errors,
  labels,
  show,
}: {
  errors: FieldErrors<T>;
  /** field name → [input id, visible label] */
  labels: Partial<Record<keyof T, [string, string]>>;
  show: boolean;
}) {
  const { t, locale } = useI18n();
  if (!show) return null;
  const items = (Object.keys(errors) as (keyof T)[]).flatMap((k) => {
    const l = labels[k];
    return l ? [{ id: l[0], label: l[1] }] : [];
  });
  return <FormErrorSummary title={t.form.summary(formatNumber(items.length, locale))} items={items} />;
}

/** Runs the mock submit and the success toast; returns a submit handler. */
export function useMockSubmit<T extends FieldValues>(form: UseFormReturn<T>, success: string, after?: () => void) {
  const { t } = useI18n();
  return form.handleSubmit(async () => {
    // TODO(api): replace with the real request.
    await mockSubmit();
    notify(success, "success", { dismissLabel: t.a11y.dismiss });
    if (after) after();
    else form.reset();
  });
}

/**
 * Email capture — the NOVA Dispatch (home and article newsletter bands) and
 * the section follow box. One field; the layout varies by `variant`.
 */
export function NewsletterForm({
  variant = "band",
  success,
  buttonLabel,
  label,
  offers,
  footnote,
}: {
  /** `band` = inverted ink band; `stack` = sidebar panel. */
  variant?: "band" | "stack";
  success?: string;
  buttonLabel?: string;
  label?: string;
  /** Optional marketing-consent checkbox text. */
  offers?: string;
  footnote?: ReactNode;
}) {
  const { t } = useI18n();
  const id = useId();
  const emailLabel = label ?? t.newsletter.emailLabel;
  const schema = z.object({ email: fields(t).email(emailLabel), offers: z.boolean().optional() });
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), ...formMode });
  const onSubmit = useMockSubmit(form, success ?? t.newsletter.subscribed);
  const err = form.formState.errors.email?.message;

  return (
    <form
      className={cn(variant === "band" ? "grid gap-3" : "flex flex-col gap-3")}
      noValidate
      onSubmit={onSubmit}
    >
      <Field
        id={`nl${id}`}
        label={emailLabel}
        required
        requiredLabel={t.form.required}
        error={err}
        labelClassName={variant === "band" ? "text-inherit" : undefined}
      >
        <Input
          type="email"
          tone={variant === "band" ? "ink" : "default"}
          placeholder={t.newsletter.placeholder}
          autoComplete="email"
          {...form.register("email")}
        />
      </Field>
      <Button
        type="submit"
        variant={variant === "band" ? "primary" : "accent"}
        tone={variant === "band" ? "ink" : "default"}
        loading={form.formState.isSubmitting}
      >
        {buttonLabel ?? t.newsletter.subscribe}
      </Button>
      {offers && <Checkbox tone="ink" label={offers} {...form.register("offers")} />}
      {footnote && (
        <Text variant="meta" tone="soft">
          {footnote}
        </Text>
      )}
    </form>
  );
}

/**
 * Shown in place of a form once it succeeds (reference data-success-panel).
 * Takes focus when it appears so keyboard and screen-reader users land on it.
 */
export function SuccessPanel({
  eyebrow,
  title,
  children,
  action,
  className,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div ref={(el) => el?.focus()} tabIndex={-1} className={className}>
      <Panel variant="sunk">
        <Text variant="eyebrow" tone="accent">
          {eyebrow}
        </Text>
        <Heading level={2} size="h3" mt={12} mb={12}>
          {title}
        </Heading>
        <Text variant="small">{children}</Text>
        {action}
      </Panel>
    </div>
  );
}
