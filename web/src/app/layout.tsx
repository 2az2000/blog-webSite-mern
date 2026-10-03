import type { Metadata, Viewport } from "next";

// Must be the first stylesheet: it declares the cascade-layer order that every
// CSS Module relies on. Next.js orders CSS by import order.
import "./globals.css";

import { AppProviders } from "@/components/providers/app-providers";
import { themeBootScript } from "@/hooks/use-theme";
import { localeMeta } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n";

import { fontVariables } from "./fonts";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return {
    // Absolute base for Open Graph images. Set SITE_URL in production.
    metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
    title: { default: t.site.title, template: `%s — ${t.site.name}` },
    description: t.site.description,
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F6F2" },
    { media: "(prefers-color-scheme: dark)", color: "#0E0E10" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    // data-theme is rewritten before paint by the boot script, hence suppressHydrationWarning.
    <html lang={locale} dir={localeMeta[locale].dir} data-theme="light" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <AppProviders locale={locale}>{children}</AppProviders>
      </body>
    </html>
  );
}
