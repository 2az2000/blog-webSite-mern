"use client";

import { useState, type ReactNode } from "react";

import { Notice } from "@/components/patterns/feedback";
import { SecHead } from "@/components/patterns/sec-head";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { notify } from "@/components/ui/sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge, Button, ButtonLink, Cluster, flex, IconCheck, IconMinus, Text } from "@/components/primitives";
import { routes } from "@/config/routes";
import { useI18n } from "@/i18n/i18n-provider";
import { cn } from "@/lib/utils";

/* Plans, billing period and checkout (reference subscribe.html script). */

type Period = "monthly" | "annual";

type Plan = {
  name: string;
  note: string;
  price?: Record<Period, string>;
  features: [label: string, included: boolean][];
  featured?: boolean;
  footnote?: string;
};

const CADENCE: Record<Period, string> = {
  monthly: "per month, cancel any time",
  annual: "per year — two months free, cancel any time",
};

const PLANS: Plan[] = [
  {
    name: "Free",
    note: "For readers who arrive from the Dispatch",
    features: [
      ["Five articles a month, any section", true],
      ["The NOVA Dispatch, twice a week", true],
      ["Comments, once you verify an email", true],
      ["Long reads and investigations", false],
      ["Full archive back to 2021", false],
      ["Saved articles and collections", false],
    ],
  },
  {
    name: "Reader",
    note: "Everything we publish, on every device",
    price: { monthly: "£7", annual: "£70" },
    featured: true,
    features: [
      ["Unlimited articles, no meter", true],
      ["Long reads, investigations and interviews", true],
      ["Full archive back to 2021", true],
      ["Saved articles, collections and reading list", true],
      ["Ad-free on every surface, including email", true],
      ["Reporter briefings and the annual print edition", false],
    ],
    footnote: "Student and low-income rate available at £3. No documentation required; we take your word for it.",
  },
  {
    name: "Premium",
    note: "For readers who want to fund the slow work",
    price: { monthly: "£18", annual: "£180" },
    features: [
      ["Everything in Reader", true],
      ["Monthly briefing call with the reporting desk", true],
      ["Datasets published alongside investigations", true],
      ["The annual print edition, posted", true],
      ["Two gift subscriptions a year", true],
      ["Your name in the masthead, if you want it", true],
    ],
  },
];

/* .plan__name — the serif at h3 size */
const PLAN_NAME = "font-serif text-h3 leading-h3 tracking-h3";

function PlanCard({ plan, period, action }: { plan: Plan; period: Period; action: ReactNode }) {
  const head = plan.featured ? (
    <>
      <Cluster gap={12} wrap={false}>
        <h3 className={cn(PLAN_NAME, flex.fill)}>{plan.name}</h3>
        <Badge className={flex.fixed}>Most chosen</Badge>
      </Cluster>
      <Text variant="meta">{plan.note}</Text>
    </>
  ) : (
    <div>
      <h3 className={PLAN_NAME}>{plan.name}</h3>
      <Text variant="meta" mt={8}>
        {plan.note}
      </Text>
    </div>
  );
  return (
    // .plan / .plan--featured
    <div
      className={cn(
        "grid content-start gap-4 border bg-surface p-8",
        plan.featured ? "border-2 border-fg shadow-raised" : "border-border",
      )}
    >
      {head}
      <div className="grid gap-1 *:block *:min-w-0">
        <span className="font-serif text-plan leading-none whitespace-nowrap tabular-nums">
          {plan.price ? plan.price[period] : "£0"}
        </span>
        <span className="text-caption text-meta">{plan.price ? CADENCE[period] : "Forever. No card required."}</span>
      </div>
      <ul className="grid list-none gap-3 text-body-sm">
        {plan.features.map(([label, on]) => (
          <li
            key={label}
            className={cn(
              "grid grid-cols-lead items-start gap-3 [&_svg]:mt-0.75 [&_svg]:size-4.5",
              on ? "text-fg-soft [&_svg]:text-success" : "text-muted-soft [&_svg]:text-muted-soft",
            )}
          >
            {on ? <IconCheck /> : <IconMinus />}
            <span>{label}</span>
          </li>
        ))}
      </ul>
      {action}
      {plan.footnote && <Text variant="meta">{plan.footnote}</Text>}
    </div>
  );
}

export function PlanPicker() {
  const { t, locale } = useI18n();
  const toast = (msg: string) => notify(msg, "success", { dismissLabel: t.a11y.dismiss });
  const [period, setPeriod] = useState<Period>("monthly");
  const [checkout, setCheckout] = useState<Plan | null>(null);

  return (
    <>
      <SecHead
        index={1}
        id="plans-title"
        locale={locale}
        weight="major"
        title="Choose how you read"
        action={
          <Tabs
            value={period}
            onValueChange={(v) => {
              setPeriod(v as Period);
              toast(v === "annual" ? "Showing annual pricing — two months free" : "Showing monthly pricing");
            }}
          >
            <TabsList className="m-0 border-0 p-0" aria-label="Billing period">
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="annual">Annual</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      <div className="grid grid-cols-3 items-start gap-col max-lg:grid-cols-1">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.name}
            plan={plan}
            period={period}
            action={
              plan.price ? (
                <Button variant={plan.featured ? "accent" : "primary"} block onClick={() => setCheckout(plan)}>
                  Subscribe — {plan.name}
                </Button>
              ) : (
                <ButtonLink href={routes.signUp()} variant="secondary" block>Create a free account</ButtonLink>
              )
            }
          />
        ))}
      </div>

      <Dialog open={checkout !== null} onOpenChange={(open) => !open && setCheckout(null)}>
        <DialogContent>
          <Text variant="eyebrow" tone="accent">
            Secure checkout
          </Text>
          <DialogTitle>Subscribe — {checkout?.name}</DialogTitle>
          <DialogDescription>
            You will be charged <strong>{checkout?.price?.[period] ?? "£0"}</strong> and can cancel at any time from
            account settings.
          </DialogDescription>
          <Notice bareIcon>
            This prototype takes no payment and transmits nothing. A real checkout would hand off to the payment provider
            at this point.
          </Notice>
          <DialogFooter className="mt-0 gap-3">
            <DialogClose asChild>
              <Button variant="secondary">Not now</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button variant="accent" onClick={() => toast("Checkout would open here — nothing was charged")}>
                Continue to payment
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
