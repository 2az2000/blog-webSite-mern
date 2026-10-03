"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { BookmarkButton, ShareBar } from "@/components/patterns/actions";
import { Comment } from "@/components/patterns/comment";
import { Notice, Panel } from "@/components/patterns/feedback";
import { Field } from "@/components/patterns/field";
import { ErrorSummary, formMode, useMockSubmit } from "@/components/patterns/forms";
import { Breadcrumbs, Pagination } from "@/components/patterns/navigation";
import { SecHead } from "@/components/patterns/sec-head";
import { SortMenu } from "@/components/patterns/sort-menu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { notify } from "@/components/ui/sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Avatar,
  Badge,
  Button,
  Checkbox,
  Cluster,
  Code,
  Col,
  Container,
  Grid,
  Heading,
  Input,
  Section,
  Stack,
  Tag,
  Text,
  Textarea,
} from "@/components/primitives";
import { routes } from "@/config/routes";
import { useI18n } from "@/i18n/i18n-provider";
import { fields } from "@/lib/validation";

/* design-system.html §07 · Components — every interactive state, live. */

const H4 = ({ children, mb = 16, mt }: { children: React.ReactNode; mb?: 16; mt?: 64 }) => (
  <Heading level={3} size="h4" mb={mb} mt={mt}>
    {children}
  </Heading>
);

/* The reference marks the demo inputs `.is-error` / `.is-success`, which no rule defines: the
   field shows its message but keeps the neutral border. aria-invalid would turn the border red,
   so the demo restates the neutral one. */
const NEUTRAL = "aria-invalid:border-strong aria-invalid:focus:shadow-focus";

/** Reference form: validate on blur, re-validate while typing once in error, summary on submit. */
function DemoForm() {
  const { t } = useI18n();
  const schema = z.object({
    email: fields(t).email("Email address"),
    note: z.string().optional(),
    agree: z.boolean().optional(),
  });
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), ...formMode });
  const submit = useMockSubmit(form, "Saved.");
  const { errors, isSubmitting, submitCount } = form.formState;

  return (
    <Stack as="form" gap={24} noValidate onSubmit={submit}>
      <ErrorSummary show={submitCount > 0} errors={errors} labels={{ email: ["ds-email", "Email address"] }} />
      <Field
        id="ds-email"
        label="Email address"
        required
        requiredLabel={t.form.required}
        hint="Validated on blur, never on every keystroke."
        error={errors.email?.message}
      >
        <Input type="email" placeholder="you@example.com" autoComplete="email" {...form.register("email")} />
      </Field>
      <Field id="ds-note" label="A note">
        <Textarea placeholder="Optional" {...form.register("note")} />
      </Field>
      <Checkbox label="A checkbox, with the label as the hit target." {...form.register("agree")} />
      <Button type="submit" loading={isSubmitting}>
        Submit to see the states
      </Button>
    </Stack>
  );
}

const SORTS = [
  { key: "rel", label: "Relevance" },
  { key: "new", label: "Newest" },
  { key: "pop", label: "Most popular" },
] as const;

export function ComponentsDemo() {
  const { t, locale } = useI18n();
  const [sort, setSort] = useState<(typeof SORTS)[number]["key"]>("rel");

  return (
    <Section aria-labelledby="comp-title">
      <Container>
        <SecHead index={7} id="comp-title" locale={locale} title="Components" />

        <H4>Buttons — every state</H4>
        <Cluster gap={12}>
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="accent">Accent</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button disabled>Disabled</Button>
          <Button loading>Loading</Button>
          <Button variant="secondary" size="sm">
            Small
          </Button>
        </Cluster>
        <Text variant="meta" mt={16}>
          Hover, focus-visible and active are defined for all five kinds. Loading is a class, not a swap, so the label
          never disappears and the button keeps its width.
        </Text>

        <H4 mt={64}>Badges, tags, avatars</H4>
        <Cluster gap={12}>
          <Badge>Technology</Badge>
          <Badge variant="opinion">Opinion</Badge>
          <Badge variant="boxed">Long read</Badge>
          <Tag href={routes.topic("artificial-intelligence")}>Artificial intelligence</Tag>
          <Tag href={routes.topic("work")}>Work</Tag>
          <Avatar initials="ED" size="sm" />
          <Avatar initials="MF" />
          <Avatar initials="HV" tone="opinion" />
          <Avatar initials="SL" size="lg" />
        </Cluster>
        <Text variant="meta" mt={16} measure="long">
          Avatars are typographic monograms. NOVA does not use stock photographs of people who are not the writer; where
          a commissioned portrait exists, the author page uses it and says so in the caption.
        </Text>

        <H4 mt={64}>Form controls — default, focus, error, success, disabled</H4>
        <Grid rowGap={32}>
          <Col span={6}>
            <DemoForm />
          </Col>
          <Col span={6}>
            <Stack gap={24}>
              <Field
                id="ds-err"
                label="Field in error"
                error="Enter an email address in the form name@example.com — the cause and the remedy, next to the field."
              >
                <Input defaultValue="not-an-email" className={NEUTRAL} />
              </Field>
              <Field id="ds-ok" label="Field accepted" success="Looks right.">
                <Input defaultValue="elena@nova.example" />
              </Field>
              <Field id="ds-off" label="Disabled">
                <Input defaultValue="Unavailable on the free plan" disabled />
              </Field>
            </Stack>
          </Col>
        </Grid>

        <H4 mt={64}>Navigation components</H4>
        <Stack gap={32}>
          <Tabs defaultValue="latest">
            <TabsList aria-label="Example tabs">
              <TabsTrigger value="latest">Latest</TabsTrigger>
              <TabsTrigger value="popular">Popular</TabsTrigger>
              <TabsTrigger value="discussed">Most discussed</TabsTrigger>
            </TabsList>
          </Tabs>
          <Pagination current={1} total={12} locale={locale} hrefFor={() => "#comp-title"} />
          <div>
            <SortMenu label="Sort" options={[...SORTS]} value={sort} onChange={setSort} />
          </div>
          <Breadcrumbs
            label={t.a11y.breadcrumb}
            items={[
              { label: t.nav.home, href: routes.home() },
              { label: t.nav.technology, href: routes.category("technology") },
              { label: "A story" },
            ]}
          />
        </Stack>

        <H4 mt={64}>Overlays and feedback</H4>
        <Cluster gap={12}>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary">Open a modal</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>A modal</DialogTitle>
              <DialogDescription className="mt-4">
                Focus is trapped while it is open, Escape closes it, and focus returns to the control that opened it. It
                never carries primary-flow navigation.
              </DialogDescription>
              <DialogFooter className="mt-6">
                <DialogClose asChild>
                  <Button variant="secondary">{t.a11y.close}</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button
            variant="secondary"
            onClick={() =>
              notify("Toasts announce politely and dismiss themselves after 4 seconds.", "success", {
                dismissLabel: t.a11y.dismiss,
              })
            }
          >
            Raise a toast
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm">
                Hover for a tooltip
              </Button>
            </TooltipTrigger>
            <TooltipContent>Tooltips are supplementary only — never the sole carrier of a meaning.</TooltipContent>
          </Tooltip>
        </Cluster>
        <Stack gap={16} mt={32}>
          <Notice bareIcon>An informational notice.</Notice>
          <Notice tone="success" bareIcon>
            A success notice.
          </Notice>
          <Notice tone="warning" bareIcon>
            A warning notice.
          </Notice>
          <Notice tone="error" bareIcon>
            An error notice — an icon and a word, never colour alone.
          </Notice>
        </Stack>

        <H4 mt={64}>Reading progress, share, bookmark</H4>
        <Cluster gap={24}>
          <ShareBar title="The NOVA design system">
            <BookmarkButton slug="design-system-demo" label="this example" />
          </ShareBar>
          <Text variant="meta">
            Bookmark is a real toggle: it writes to <Code>localStorage</Code>, changes <Code>aria-pressed</Code>, fills
            the glyph and raises a toast. The state survives a reload and shows up on the bookmarks page.
          </Text>
        </Cluster>
        <Panel variant="sunk" className="mt-6">
          <Text variant="index" mb={8}>
            Reading progress
          </Text>
          {/* .spec-progress: the reference ships no CSS for it, so it is an empty box */}
          <div>
            <span />
          </div>
          <Text variant="meta" mt={12}>
            3px, accent, fixed to the top of the viewport, updated on scroll and hidden from assistive technology — the
            article&apos;s own headings carry the structure.
          </Text>
        </Panel>

        <H4 mt={64}>Comment</H4>
        <Comment
          author="Jamie Rowe"
          initials="JR"
          badge={t.comments.subscriber}
          time="2 hours ago"
          likes={12}
          labels={{ reply: t.comments.reply, report: t.comments.report }}
        >
          The default, with its reply, like, and report actions. Replies indent once and never further; a moderated
          comment keeps its slot and states why it was removed.
        </Comment>
      </Container>
    </Section>
  );
}
