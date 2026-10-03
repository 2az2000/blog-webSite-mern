"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Field } from "@/components/patterns/field";
import { ErrorSummary, formMode, SuccessPanel, useMockSubmit } from "@/components/patterns/forms";
import { Notice } from "@/components/patterns/feedback";
import { notify } from "@/components/ui/sonner";
import { Button, Checkbox, Cluster, flex, Heading, Input, Stack, Tag, Text } from "@/components/primitives";
import { useI18n } from "@/i18n/i18n-provider";
import { cn } from "@/lib/utils";
import { fields } from "@/lib/validation";

/*
 * Five authentication screens on one route, addressed by the URL hash exactly
 * as in the reference (#signin, #signup, #forgot, #reset, #verify).
 * Submissions are mocked. TODO(api): wire sign-in/sign-up to /api/users/*.
 */

const VIEWS = ["signin", "signup", "forgot", "reset", "verify"] as const;
type View = (typeof VIEWS)[number];

const TITLES: Record<View, string> = {
  signin: "Sign in — NOVA",
  signup: "Create an account — NOVA",
  forgot: "Forgotten password — NOVA",
  reset: "Choose a new password — NOVA",
  verify: "Verify your email — NOVA",
};

const LABELS: Record<View, string> = {
  signin: "Sign in",
  signup: "Sign up",
  forgot: "Forgot",
  reset: "Reset",
  verify: "Verify",
};

function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}
const readHash = (): View => {
  const h = window.location.hash.slice(1);
  return (VIEWS as readonly string[]).includes(h) ? (h as View) : "signin";
};

function useView(): [View, (v: View) => void] {
  const view = useSyncExternalStore(subscribeHash, readHash, () => "signin" as View);
  const go = (v: View) => {
    history.replaceState(null, "", `#${v}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    // Move focus to the new screen's heading, as the reference does.
    requestAnimationFrame(() => document.getElementById(`${v}-title`)?.focus());
  };
  return [view, go];
}

/** An in-panel link that switches screen. Forwards props so it can sit inside `Button asChild`. */
function Goto({
  to,
  go,
  children,
  ...props
}: { to: View; go: (v: View) => void; children: ReactNode } & Omit<React.ComponentProps<"a">, "href">) {
  return (
    <a
      {...props}
      href={`#${to}`}
      onClick={(e) => {
        e.preventDefault();
        go(to);
      }}
    >
      {children}
    </a>
  );
}

function ScreenHead({ id, eyebrow, title }: { id: string; eyebrow: string; title: string }) {
  return (
    <>
      <Text variant="eyebrow" tone="accent">
        {eyebrow}
      </Text>
      {/* the reference writes mt-12 here, a class it never defines: no top margin */}
      <Heading level={1} size="h1" mb={24} id={id} tabIndex={-1}>
        {title}
      </Heading>
    </>
  );
}

function SignIn({ go }: { go: (v: View) => void }) {
  const { t } = useI18n();
  const f = fields(t);
  const schema = z.object({ email: f.email("Email address"), password: f.required("Password"), keep: z.boolean() });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", keep: true },
    ...formMode,
  });
  const submit = useMockSubmit(form, "Signed in. Taking you back to what you were reading.");
  const { errors, isSubmitting, submitCount } = form.formState;
  return (
    <section aria-labelledby="signin-title">
      <ScreenHead id="signin-title" eyebrow="Welcome back" title="Sign in" />
      <form noValidate onSubmit={submit}>
        <Stack flow="flex" gap={24}>
          <ErrorSummary
            show={submitCount > 0}
            errors={errors}
            labels={{ email: ["si-email", "Email address"], password: ["si-pass", "Password"] }}
          />
          <Field id="si-email" label="Email address" required requiredLabel={t.form.required} error={errors.email?.message}>
            <Input type="email" autoComplete="email" placeholder="you@example.com" {...form.register("email")} />
          </Field>
          <Field
            id="si-pass"
            label="Password"
            required
            requiredLabel={t.form.required}
            error={errors.password?.message}
            hint={
              <Goto to="forgot" go={go}>
                Forgotten your password?
              </Goto>
            }
          >
            <Input type="password" autoComplete="current-password" {...form.register("password")} />
          </Field>
          <Checkbox label="Keep me signed in on this device" {...form.register("keep")} />
          <Button type="submit" block loading={isSubmitting}>
            Sign in
          </Button>
        </Stack>
      </form>
      <Text variant="meta" mt={24}>
        No account yet?{" "}
        <Goto to="signup" go={go}>
          Create a free one
        </Goto>{" "}
        — it takes about twenty seconds.
      </Text>
    </section>
  );
}

function SignUp({ go }: { go: (v: View) => void }) {
  const { t } = useI18n();
  const f = fields(t);
  const [done, setDone] = useState(false);
  const schema = z.object({
    name: f.required("Name"),
    email: f.email("Email address"),
    password: f.password("Password"),
    dispatch: z.boolean(),
  });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", dispatch: true },
    ...formMode,
  });
  const submit = useMockSubmit(form, "Account created. Check your email to verify it.", () => setDone(true));
  const { errors, isSubmitting, submitCount } = form.formState;

  return (
    <>
      <section aria-labelledby="signup-title">
        <ScreenHead id="signup-title" eyebrow="Free account" title="Create your account" />
        {!done && (
          <form noValidate onSubmit={submit}>
            <Stack flow="flex" gap={24}>
              <ErrorSummary
                show={submitCount > 0}
                errors={errors}
                labels={{
                  name: ["su-name", "Name"],
                  email: ["su-email", "Email address"],
                  password: ["su-pass", "Password"],
                }}
              />
              <Field id="su-name" label="Name" required requiredLabel={t.form.required} error={errors.name?.message}>
                <Input autoComplete="name" placeholder="How you want to appear in comments" {...form.register("name")} />
              </Field>
              <Field id="su-email" label="Email address" required requiredLabel={t.form.required} error={errors.email?.message}>
                <Input type="email" autoComplete="email" placeholder="you@example.com" {...form.register("email")} />
              </Field>
              <Field
                id="su-pass"
                label="Password"
                required
                requiredLabel={t.form.required}
                error={errors.password?.message}
                hint="At least 8 characters. A passphrase of three ordinary words beats a short complicated one."
              >
                <Input type="password" autoComplete="new-password" {...form.register("password")} />
              </Field>
              <Checkbox
                label="Send me the NOVA Dispatch twice a week. You can stop this from any issue."
                {...form.register("dispatch")}
              />
              <Button type="submit" variant="accent" block loading={isSubmitting}>
                Create account
              </Button>
              <Text variant="meta">By creating an account you agree to the terms and the privacy notice.</Text>
            </Stack>
          </form>
        )}
        <Text variant="meta" mt={24}>
          Already have one?{" "}
          <Goto to="signin" go={go}>
            Sign in instead
          </Goto>
          .
        </Text>
      </section>
      {done && (
        <SuccessPanel
          eyebrow="Almost done"
          title="Verify your email"
          action={
            <Button asChild variant="secondary" size="sm" className="mt-4">
              <Goto to="verify" go={go}>
                See the verification screen
              </Goto>
            </Button>
          }
        >
          We have sent a link to the address you gave. Click it and your account is live.
        </SuccessPanel>
      )}
    </>
  );
}

function Forgot({ go }: { go: (v: View) => void }) {
  const { t } = useI18n();
  const [done, setDone] = useState(false);
  const schema = z.object({ email: fields(t).email("Email address") });
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), ...formMode });
  const submit = useMockSubmit(form, "If that address has an account, a reset link is on its way.", () => setDone(true));
  const { errors, isSubmitting } = form.formState;

  return (
    <>
      <section aria-labelledby="forgot-title">
        <ScreenHead id="forgot-title" eyebrow="Password reset" title="Forgotten password" />
        <Text tone="muted" mb={24}>
          Give us the address on the account and we will send a reset link. The link works once and expires after an
          hour.
        </Text>
        {!done && (
          <form noValidate onSubmit={submit}>
            <Stack flow="flex" gap={24}>
              <Field id="fp-email" label="Email address" required requiredLabel={t.form.required} error={errors.email?.message}>
                <Input type="email" autoComplete="email" placeholder="you@example.com" {...form.register("email")} />
              </Field>
              <Button type="submit" block loading={isSubmitting}>
                Send reset link
              </Button>
            </Stack>
          </form>
        )}
        <Text variant="meta" mt={24}>
          <Goto to="signin" go={go}>
            Back to sign in
          </Goto>
        </Text>
      </section>
      {done && (
        <SuccessPanel
          eyebrow="Check your inbox"
          title="Link sent"
          action={
            <Button asChild variant="secondary" size="sm" className="mt-4">
              <Goto to="reset" go={go}>
                See the reset screen
              </Goto>
            </Button>
          }
        >
          If an account exists for that address, the reset link is on its way. We do not confirm whether an address is
          registered — that would tell anyone with your email that you read us.
        </SuccessPanel>
      )}
    </>
  );
}

function Reset({ go }: { go: (v: View) => void }) {
  const { t } = useI18n();
  const f = fields(t);
  const MISMATCH =
    "The two passwords do not match. Retype the second one — this field is shown here in its error state as a reference.";
  const schema = z
    .object({ password: f.password("New password"), confirm: f.required("Confirm new password") })
    .refine((v) => v.password === v.confirm, { path: ["confirm"], message: MISMATCH });
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), ...formMode });
  const submit = useMockSubmit(form, "Password changed. You are signed in.");
  const { errors, isSubmitting } = form.formState;

  // Reference: the confirm field is shown in its error state on arrival.
  useEffect(() => {
    form.setError("confirm", { message: MISMATCH });
  }, [form]);

  return (
    <section aria-labelledby="reset-title">
      <ScreenHead id="reset-title" eyebrow="Password reset" title="Choose a new password" />
      <form noValidate onSubmit={submit}>
        <Stack flow="flex" gap={24}>
          <Field
            id="rp-pass"
            label="New password"
            required
            requiredLabel={t.form.required}
            hint="At least 8 characters."
            error={errors.password?.message}
          >
            <Input type="password" autoComplete="new-password" {...form.register("password")} />
          </Field>
          <Field id="rp-confirm" label="Confirm new password" required requiredLabel={t.form.required} error={errors.confirm?.message}>
            <Input type="password" autoComplete="new-password" {...form.register("confirm")} />
          </Field>
          <Button type="submit" block loading={isSubmitting}>
            Set new password and sign in
          </Button>
        </Stack>
      </form>
      <Text variant="meta" mt={24}>
        Link expired?{" "}
        <Goto to="forgot" go={go}>
          Request a new one
        </Goto>
        .
      </Text>
    </section>
  );
}

function Verify() {
  const { t } = useI18n();
  const schema = z.object({ code: fields(t).required("Verification code") });
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), ...formMode });
  const submit = useMockSubmit(form, "Email verified. Welcome to NOVA.");
  const { errors, isSubmitting } = form.formState;

  return (
    <section aria-labelledby="verify-title">
      <ScreenHead id="verify-title" eyebrow="One last step" title="Verify your email" />
      <Text tone="muted">
        We sent a six-character code to <strong className="text-fg">you@example.com</strong>. Enter it below, or use the
        link in the same email.
      </Text>
      <form className="mt-6" noValidate onSubmit={submit}>
        <Stack flow="flex" gap={24}>
          <Field
            id="v-code"
            label="Verification code"
            required
            requiredLabel={t.form.required}
            hint="The code expires in 15 minutes."
            error={errors.code?.message}
          >
            <Input
              mono
              className="text-index tabular-nums"
              inputMode="text"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="A7K2QP"
              {...form.register("code")}
            />
          </Field>
          <Button type="submit" variant="accent" block loading={isSubmitting}>
            Verify email
          </Button>
        </Stack>
      </form>
      <Notice className="mt-6" bareIcon>
        Nothing arrived? Check spam, then{" "}
        <Button
          variant="ghost"
          size="inline"
          onClick={() => notify("A new code is on its way", "success", { dismissLabel: t.a11y.dismiss })}
        >
          send it again
        </Button>
        .
      </Notice>
    </section>
  );
}

export function AuthScreens() {
  const [view, go] = useView();

  useEffect(() => {
    document.title = TITLES[view];
  }, [view]);

  return (
    <>
      {view === "signin" && <SignIn go={go} />}
      {view === "signup" && <SignUp go={go} />}
      {view === "forgot" && <Forgot go={go} />}
      {view === "reset" && <Reset go={go} />}
      {view === "verify" && <Verify />}

      <Cluster as="nav" gap={8} className="mt-12 border-t border-border pt-6" aria-label="Authentication screens">
        <span className={cn(flex.fixed, "me-2 text-caption leading-tight whitespace-nowrap text-meta")}>All screens</span>
        {VIEWS.map((v) => (
          <Tag
            key={v}
            href={`#${v}`}
            active={v === view}
            onClick={(e) => {
              e.preventDefault();
              go(v);
            }}
          >
            {LABELS[v]}
          </Tag>
        ))}
      </Cluster>
    </>
  );
}
