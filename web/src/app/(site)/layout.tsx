import { SiteFooter, SkipLink } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getLocale } from "@/i18n";

/** Chrome shared by every public screen: skip link, masthead, footer. */
export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <>
      <SkipLink locale={locale} />
      <SiteHeader />
      <main id="main">
        {children}
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
