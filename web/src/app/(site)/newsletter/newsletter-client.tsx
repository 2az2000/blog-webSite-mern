"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Notice } from "@/components/patterns/feedback";
import { Field } from "@/components/patterns/field";
import { formMode, SuccessPanel, useMockSubmit } from "@/components/patterns/forms";
import { notify } from "@/components/ui/sonner";
import { panelClass } from "@/components/patterns/feedback";
import { Button, ButtonLink, Cluster, flex, Input, Radio, Stack, Tag, Text } from "@/components/primitives";
import { routes } from "@/config/routes";
import { useI18n } from "@/i18n/i18n-provider";
import { cn } from "@/lib/utils";
import { fields } from "@/lib/validation";

/* Interactive parts of newsletter.html. */

export function DispatchSignup() {
  const { t } = useI18n();
  const [done, setDone] = useState(false);
  const schema = z.object({ email: fields(t).email("Email address") });
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), ...formMode });
  const submit = useMockSubmit(form, "Almost there — confirm from the email we just sent.", () => setDone(true));
  const { errors, isSubmitting } = form.formState;

  if (done) {
    return (
      <SuccessPanel
        className="mt-8 max-w-ch-46"
        eyebrow="Check your inbox"
        title="One more step"
        action={
          <ButtonLink href={routes.home()} variant="secondary" size="sm" className="mt-4">
            Back to the homepage
          </ButtonLink>
        }
      >
        We have sent a confirmation link. Click it and the next Dispatch arrives Tuesday at 07:00 in your local time.
      </SuccessPanel>
    );
  }

  return (
    <form className={cn(panelClass(), "mt-8 max-w-ch-46")} noValidate onSubmit={submit}>
      <Field
        id="hero-email"
        label="Email address"
        required
        requiredLabel={t.form.required}
        hint="We send two issues a week. Nothing else, ever."
        error={errors.email?.message}
      >
        <Input type="email" placeholder="you@example.com" autoComplete="email" {...form.register("email")} />
      </Field>
      <Cluster gap={12} mt={16} wrap={false}>
        <Button type="submit" variant="accent" className={flex.fill} loading={isSubmitting}>
          Subscribe free
        </Button>
        <Button asChild variant="ghost" className={flex.fixed}>
          <a href="#sample">Read a sample first</a>
        </Button>
      </Cluster>
      <Text variant="meta" mt={16}>
        By subscribing you agree to our privacy notice. We never sell reader data, and unsubscribing takes one click from
        any issue — no survey, no retention offer.
      </Text>
    </form>
  );
}

const TOPICS = ["Technology", "Business", "Science", "Design", "Culture", "Society", "Opinion", "Long reads"];

export function TopicToggles() {
  const [picked, setPicked] = useState<string[]>([]);
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="sr-only">Newsletter topics</legend>
      <Cluster gap={8}>
        {TOPICS.map((topic) => {
          const on = picked.includes(topic);
          return (
            <Tag
              key={topic}
              aria-pressed={on}
              onClick={() => setPicked((p) => (on ? p.filter((x) => x !== topic) : [...p, topic]))}
            >
              {topic}
            </Tag>
          );
        })}
      </Cluster>
    </fieldset>
  );
}

const FREQUENCIES = [
  { value: "both", strong: "Twice a week", rest: " — Tuesday and Friday. The default." },
  { value: "weekly", strong: "Friday only", rest: " — the week in one issue." },
  { value: "monthly", strong: "Monthly", rest: " — long reads and investigations only." },
];

export function FrequencyPicker() {
  const { t } = useI18n();
  return (
    <>
      <Stack as="fieldset" gap={12} className="m-0 border-0 p-0">
        <legend className="sr-only">How often to send the Dispatch</legend>
        {FREQUENCIES.map((f) => (
          <Radio
            key={f.value}
            name="freq"
            value={f.value}
            defaultChecked={f.value === "both"}
            onChange={() => notify("Frequency preference saved", "success", { dismissLabel: t.a11y.dismiss })}
            label={
              <>
                <strong className="text-fg">{f.strong}</strong>
                {f.rest}
              </>
            }
          />
        ))}
      </Stack>
      <Notice className="mt-6" bareIcon>
        Frequency is changeable from the footer of any issue, and from your account settings.
      </Notice>
    </>
  );
}
