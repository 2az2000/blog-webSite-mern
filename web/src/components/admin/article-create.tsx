"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Notice } from "@/components/patterns/feedback";
import { Field } from "@/components/patterns/field";
import { Button, Container, Heading, Input, Select, Stack, Text } from "@/components/primitives";
import { routes } from "@/config/routes";
import { useI18n } from "@/i18n/i18n-provider";
import { ApiError } from "@/lib/api";
import { articles, directory, type AuthorChoice } from "@/lib/admin-api";
import type { Choice } from "@/types/admin";
import type { ArticleKind } from "@/types/content";

import { useSession } from "./admin-session";
import { errorMessage } from "./error-message";

const KINDS: ArticleKind[] = ["article", "opinion", "video", "longread", "interview"];

type Values = { kind: ArticleKind; section: string; title: string; slug: string; author: string };

/** Step one: identify the piece. The editor takes it from there. */
export function ArticleCreate() {
  const { t } = useI18n();
  const router = useRouter();
  const { me } = useSession();
  const c = t.admin.create;
  const f = t.admin.fields;
  const kinds = t.admin.kinds as Record<string, string>;
  const [sections, setSections] = useState<Choice[]>([]);
  const [authors, setAuthors] = useState<AuthorChoice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<Values>({ defaultValues: { kind: "article", section: "", title: "", slug: "", author: "" } });

  useEffect(() => {
    void directory.sections().then(setSections, () => undefined);
    void directory.authors().then(setAuthors, () => undefined);
  }, []);

  const submit = handleSubmit(async (v) => {
    setError(null);
    try {
      const created = await articles.create({
        kind: v.kind,
        section: v.section,
        title: v.title,
        ...(v.slug ? { slug: v.slug } : {}),
        ...(v.author ? { author: v.author } : {}),
      });
      router.push(routes.adminArticle(created.id));
    } catch (err) {
      setError(err instanceof ApiError ? errorMessage(err, t) : t.admin.gate.failed);
    }
  });

  return (
    <Container narrow className="py-12">
      <form onSubmit={submit} noValidate className="mx-auto grid max-w-panel gap-6">
        <Stack gap={8}>
          <Heading level={1} size="h2">
            {c.title}
          </Heading>
          <Text tone="muted">{c.lead}</Text>
        </Stack>
        {error && <Notice tone="error">{error}</Notice>}
        <Field label={f.title} required requiredLabel={t.form.required}>
          <Input {...register("title", { required: true })} />
        </Field>
        <Field label={f.kind}>
          <Select {...register("kind")}>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {kinds[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={f.section} required requiredLabel={t.form.required}>
          <Select {...register("section", { required: true })}>
            <option value="">{c.choose}</option>
            {sections.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={f.author} hint={c.authorHint}>
          <Select {...register("author")}>
            <option value="">{me.name}</option>
            {authors.map((a) => (
              <option key={a.slug} value={a.slug}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={f.slug} hint={c.slugHint}>
          <Input autoComplete="off" {...register("slug")} />
        </Field>
        <div>
          <Button type="submit" loading={formState.isSubmitting}>
            {c.submit}
          </Button>
        </div>
      </form>
    </Container>
  );
}
