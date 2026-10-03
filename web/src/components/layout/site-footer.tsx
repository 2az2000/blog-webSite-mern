import Link from "next/link";

import { Container, refLink, Wordmark } from "@/components/primitives";
import { footerColumns, legalLinks } from "@/config/navigation";
import type { Locale } from "@/i18n/config";
import { dictionaries } from "@/i18n/dictionaries";
import { cn } from "@/lib/utils";

/** .site-footer — reference nova.css §17 (+ §18) and nova.js renderFooter. Server Component. */
export function SiteFooter({ locale }: { locale: Locale }) {
  const t = dictionaries[locale];
  return (
    <footer className="mt-24 bg-ink pt-16 pb-8 text-on-ink print:hidden">
      <Container>
        <div className="grid grid-cols-footer gap-x-col gap-y-12 max-md:grid-cols-2 max-md:gap-y-8">
          <div>
            <Wordmark>{t.site.name}</Wordmark>
            <p className="mt-4 max-w-ch-34 text-caption text-on-ink/70">{t.site.footerAbout}</p>
          </div>
          {footerColumns.map((col) => (
            <div key={col.title}>
              <h3 className="mb-4 font-sans text-overline tracking-overline text-on-ink/60 uppercase">
                {t.footer[col.title]}
              </h3>
              <ul className="grid list-none gap-3">
                {col.links.map((l) => {
                  const label = "nav" in l.label ? t.nav[l.label.nav] : t.footer.links[l.label.footer];
                  return (
                    <li key={label}>
                      {/* classless in the reference: the base underline under .footer-col a's colour.
                          The 404 demo link would prefetch a 404 response on every page. */}
                      <Link
                        href={l.href}
                        prefetch={l.href === "/404" ? false : undefined}
                        className={cn(
                          refLink.underline,
                          "text-caption text-on-ink/85 transition-colors duration-180 ease-in-out hover:text-brand",
                        )}
                      >
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-4 border-t border-on-ink/18 pt-6 text-caption text-on-ink/60">
          <span>{t.site.copyright}</span>
          <nav aria-label={t.a11y.legal} className="ms-auto flex flex-wrap gap-4 max-sm:ms-0">
            {legalLinks.map((l) => (
              // classless in the reference: accent + underline
              <Link key={l.key} href={l.href} className={refLink.link}>
                {t.footer.links[l.key]}
              </Link>
            ))}
          </nav>
        </div>
      </Container>
    </footer>
  );
}

/** .skip-link — off-screen until focused. */
export function SkipLink({ locale, target = "main" }: { locale: Locale; target?: string }) {
  return (
    <a
      href={`#${target}`}
      className={cn(
        "absolute top-2 left-4 z-200 translate-y-[-200%] rounded-md bg-fg px-4 py-3 text-label font-semibold text-bg",
        "transition-[translate] duration-180 ease-out focus-visible:translate-y-0",
      )}
    >
      {dictionaries[locale].a11y.skipToContent}
    </a>
  );
}
