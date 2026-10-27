"use client";

import { createContext, use, useCallback, useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";

import { Field } from "@/components/patterns/field";
import { Notice } from "@/components/patterns/feedback";
import { Button, Container, Heading, Input, Stack, Text } from "@/components/primitives";
import { useI18n } from "@/i18n/i18n-provider";
import { ApiError } from "@/lib/api";
import { auth } from "@/lib/admin-api";
import { useAuth } from "@/stores/auth-store";
import { STAFF, type Me } from "@/types/admin";

/*
 * The staff session. The back office is a client app over the same-origin API:
 * the gate asks `/auth/me`, shows the sign-in form when there is no session,
 * and renders its children only for a writer, editor or admin. The API checks
 * the role again on every call — this gate is a courtesy, not the lock.
 */

type Session = { me: Me; signOut: () => Promise<void> };

const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const session = use(SessionContext);
  if (!session) throw new Error("useSession must be used inside <AdminGate>.");
  return session;
}

type State = { phase: "checking" } | { phase: "out" } | { phase: "in"; me: Me };

export function AdminGate({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [state, setState] = useState<State>({ phase: "checking" });

  useEffect(() => {
    let live = true;
    auth.me().then(
      (me) => live && setState({ phase: "in", me }),
      () => live && setState({ phase: "out" }),
    );
    return () => {
      live = false;
    };
  }, []);

  const signOut = useCallback(async () => {
    await useAuth.getState().signOut();
    setState({ phase: "out" });
  }, []);

  if (state.phase === "checking") {
    return (
      <Container narrow className="py-16">
        <Text tone="muted" role="status">
          {t.admin.session.checking}
        </Text>
      </Container>
    );
  }
  if (state.phase === "out") return <SignIn onSignedIn={(me) => setState({ phase: "in", me })} />;

  if (!STAFF.includes(state.me.role)) {
    return (
      <Container narrow className="py-16">
        <Stack gap={16}>
          <Heading level={1}>{t.admin.gate.noAccess}</Heading>
          <Text tone="muted">{t.admin.gate.noAccessLead}</Text>
          <div>
            <Button variant="secondary" onClick={signOut}>
              {t.admin.session.signOut}
            </Button>
          </div>
        </Stack>
      </Container>
    );
  }

  return <SessionContext value={{ me: state.me, signOut }}>{children}</SessionContext>;
}

type Credentials = { email: string; password: string };

function SignIn({ onSignedIn }: { onSignedIn: (me: Me) => void }) {
  const { t } = useI18n();
  const g = t.admin.gate;
  const { register, handleSubmit, formState } = useForm<Credentials>();
  const [error, setError] = useState<string | null>(null);

  const submit = handleSubmit(async ({ email, password }) => {
    setError(null);
    try {
      const me = await auth.signIn(email, password);
      void useAuth.getState().signedIn(me);
      onSignedIn(me);
    } catch (err) {
      setError(err instanceof ApiError && (err.status === 401 || err.status === 403 || err.status === 400) ? g.wrong : g.failed);
    }
  });

  return (
    <Container narrow className="py-16">
      <form onSubmit={submit} noValidate className="mx-auto grid max-w-auth gap-6">
        <Stack gap={8}>
          <Heading level={1} size="h2">
            {g.title}
          </Heading>
          <Text tone="muted">{g.lead}</Text>
        </Stack>
        {error && <Notice tone="error">{error}</Notice>}
        <Field label={g.email}>
          <Input type="email" autoComplete="username" {...register("email", { required: true })} />
        </Field>
        <Field label={g.password}>
          <Input type="password" autoComplete="current-password" {...register("password", { required: true })} />
        </Field>
        <Button type="submit" loading={formState.isSubmitting}>
          {g.submit}
        </Button>
      </form>
    </Container>
  );
}
