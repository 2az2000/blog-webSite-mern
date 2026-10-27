import type { Metadata } from "next";

import { CookieChoicePanel } from "@/components/patterns/cookie-notice";
import { LegalDocument } from "@/components/patterns/legal-document";
import { Badge } from "@/components/primitives";
import { routes } from "@/config/routes";
import { COOKIE_ROWS, legalDocs } from "@/content/legal";
import { getDictionary, getLocale } from "@/i18n";

/* Cookies — no reference screen. The table lists every cookie and storage key the site writes; the words are in content/legal.ts. */

export async function generateMetadata(): Promise<Metadata> {
  const doc = legalDocs[await getLocale()].cookies;
  return { title: doc.title, description: doc.description, alternates: { canonical: routes.cookies() } };
}

const th = "px-4 py-3 text-start text-overline font-650 tracking-overline text-meta uppercase";
const td = "px-4 py-3 align-top text-body-sm text-fg-soft";

export default async function CookiesPage() {
  const locale = await getLocale();
  const t = await getDictionary(locale);
  const table = t.legal.table;

  return (
    <LegalDocument
      docKey="cookies"
      after={{
        what: (
          <div className="overflow-x-auto rounded-md border border-border bg-surface">
            <table className="w-full min-w-panel border-collapse">
              <caption className="sr-only">{table.caption}</caption>
              <thead className="border-b border-border">
                <tr>
                  <th scope="col" className={th}>{table.name}</th>
                  <th scope="col" className={th}>{table.purpose}</th>
                  <th scope="col" className={th}>{table.kept}</th>
                  <th scope="col" className={th}>{table.kind}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {COOKIE_ROWS[locale].map((row) => (
                  <tr key={row.name}>
                    <th scope="row" className={`${td} text-start font-mono font-normal text-fg`}>{row.name}</th>
                    <td className={td}>{row.purpose}</td>
                    <td className={td}>{row.kept}</td>
                    <td className={td}>
                      <Badge>{row.kind === "essential" ? table.essential : table.preferences}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ),
        choose: <CookieChoicePanel />,
      }}
    />
  );
}
