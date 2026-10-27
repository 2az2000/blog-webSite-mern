import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/patterns/navigation";
import { Container } from "@/components/primitives";
import { routes } from "@/config/routes";
import { getDictionary, getLocale } from "@/i18n";

import { AccountScreen } from "./account-screen";

/* Account settings — no reference screen; built from the reference's own parts. Private: never indexed. */

export const metadata: Metadata = {
  title: "Account settings",
  description: "Your profile, password, newsletter, devices and data.",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const locale = await getLocale();
  const t = await getDictionary(locale);

  return (
    <>
      <Container>
        <Breadcrumbs
          label={t.a11y.breadcrumb}
          items={[{ label: t.nav.home, href: routes.home() }, { label: t.account.title }]}
        />
      </Container>
      <AccountScreen />
    </>
  );
}
