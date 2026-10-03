"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Dialog as DialogPrimitive, VisuallyHidden } from "radix-ui";

import {
  Button,
  ButtonLink,
  Container,
  flex,
  IconButton,
  IconClose,
  IconMenu,
  IconMoon,
  IconSearch,
  IconSun,
  Input,
  refLink,
  Wordmark,
} from "@/components/primitives";
import { primaryNav } from "@/config/navigation";
import { routes } from "@/config/routes";
import { useScrolled } from "@/hooks/use-scrolled";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/i18n/i18n-provider";
import { formatIndex } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useActiveNav } from "@/stores/active-nav-store";

/*
 * Site header — reference nova.css §5 (+ §18) and nova.js renderHeader /
 * initHeaderBehaviour. Sticky bar that compacts after 24px of scroll,
 * expanding search, theme toggle, and a full-screen mobile navigation
 * below 1024px.
 */

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Active nav item: a page-declared section (<ActiveNav>) wins over the URL. */
function useIsActive() {
  const pathname = usePathname();
  const declared = useActiveNav((s) => s.key);
  return (href: string) => (declared ? href === routes.category(declared) : isActive(pathname, href));
}

/** The masthead wordmark, linking home. Steps down one size once the page scrolls. */
function HomeMark({ compact }: { compact?: boolean }) {
  const { t } = useI18n();
  return (
    <Wordmark href={routes.home()} label={t.a11y.home} size={compact ? "compact" : "md"}>
      {t.site.name}
    </Wordmark>
  );
}

/* .header-sections a — classless in the reference, so the base underline
   stays under the muted colour; the 2px bar grows from the reading start. */
const SECTION_LINK = cn(
  "relative flex items-center text-label font-medium whitespace-nowrap text-meta",
  "transition-colors duration-120 ease-in-out hover:text-fg",
  refLink.underline,
  "aria-[current=page]:font-semibold aria-[current=page]:text-fg",
  "after:absolute after:inset-x-0 after:bottom-[max(0px,calc(50%-0.9em))] after:h-0.5 after:bg-strong after:content-['']",
  "after:origin-left after:scale-x-0 rtl:after:origin-right",
  "after:[transition:scale_var(--duration-fast)_var(--ease-out),background-color_var(--duration-micro)_var(--ease-in-out)]",
  "hover:after:scale-x-100 aria-[current=page]:after:scale-x-100 aria-[current=page]:after:bg-brand",
);

function HeaderSearch() {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrap = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);

  const submit = () => {
    const q = query.trim();
    if (q) router.push(routes.search(q));
  };

  // Close on outside click while empty — the reference behaviour.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node) && !field.current?.value) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) field.current?.focus();
  }, [open]);

  return (
    <div ref={wrap} className="relative flex items-center" role="search">
      <label className="sr-only" htmlFor="header-search">
        {t.a11y.searchLabel}
      </label>
      {/* .header-search__field — collapsed to nothing until opened */}
      <input
        ref={field}
        id="header-search"
        type="search"
        value={query}
        placeholder={t.header.searchPlaceholder}
        tabIndex={open ? 0 : -1}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") setOpen(false);
        }}
        className={cn(
          "h-10 rounded-md bg-surface text-label text-fg outline-offset-2",
          "[transition:width_var(--duration-normal)_var(--ease-out),opacity_var(--duration-fast)_var(--ease-in-out),padding_var(--duration-normal)_var(--ease-out)]",
          open ? "w-65 border border-strong px-3 opacity-100 max-lg:w-45" : "w-0 border-0 p-0 opacity-0",
        )}
      />
      <IconButton
        aria-label={t.a11y.search}
        aria-expanded={open}
        aria-controls="header-search"
        onClick={() => (open && query.trim() ? submit() : setOpen((v) => !v))}
      >
        <IconSearch />
      </IconButton>
    </div>
  );
}

function ThemeToggle() {
  const { t } = useI18n();
  const { theme, toggle } = useTheme();
  return (
    <IconButton
      aria-label={theme === "dark" ? t.a11y.toLight : t.a11y.toDark}
      aria-pressed={theme === "dark"}
      onClick={toggle}
    >
      {/* Both glyphs render; <html data-theme> picks one, so SSR never guesses. */}
      <IconSun className="dark:hidden" />
      <IconMoon className="hidden dark:block" />
    </IconButton>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  const { t, locale } = useI18n();
  const active = useIsActive();
  const [open, setOpen] = useState(false);

  // Navigating closes the menu.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <IconButton className="hidden max-lg:inline-grid" aria-label={t.a11y.openMenu}>
          <IconMenu />
        </IconButton>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        {/* .mobile-nav */}
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed inset-0 z-150 flex flex-col overflow-y-auto bg-bg pt-4 pb-8 print:hidden",
            "data-[state=closed]:animate-sheet-out data-[state=open]:animate-sheet-in",
          )}
        >
          <VisuallyHidden.Root asChild>
            <DialogPrimitive.Title>{t.a11y.sections}</DialogPrimitive.Title>
          </VisuallyHidden.Root>
          <Container>
            <div className="flex h-header items-center justify-between">
              <HomeMark />
              <DialogPrimitive.Close asChild>
                <IconButton aria-label={t.a11y.closeMenu}>
                  <IconClose />
                </IconButton>
              </DialogPrimitive.Close>
            </div>
            <form className="flex items-center gap-2" role="search" action={routes.search()}>
              <label className="sr-only" htmlFor="mobile-search">
                {t.a11y.searchLabel}
              </label>
              <Input className={flex.fill} id="mobile-search" name="q" type="search" placeholder={t.header.searchPlaceholder} />
              <Button type="submit" className={flex.fixed}>
                {t.header.searchSubmit}
              </Button>
            </form>
            <ul className="my-6 list-none">
              {primaryNav.map((item, i) => (
                // nth-child stagger: 40ms per item
                <li key={item.key} className="animate-nav-in border-b border-border" style={{ animationDelay: `${(i + 1) * 40}ms` }}>
                  {/* classless in the reference: accent + underline */}
                  <Link
                    href={item.href}
                    aria-current={active(item.href) ? "page" : undefined}
                    className={cn(
                      refLink.link,
                      "flex items-baseline justify-between gap-4 py-4 font-serif text-nav-xl leading-120 tracking-h2",
                      "max-sm:text-nav-lg fa:leading-160 aria-[current=page]:text-brand",
                    )}
                  >
                    {t.nav[item.key]}
                    <span className="font-sans text-caption text-muted-soft">{formatIndex(i + 1, locale)}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-auto grid gap-3">
              <ButtonLink href={routes.subscribe()} variant="accent" block>
                {t.header.subscribeLong}
              </ButtonLink>
              <ButtonLink href={routes.signIn()} variant="secondary" block>
                {t.header.signIn}
              </ButtonLink>
              <ButtonLink href={routes.bookmarks()} variant="ghost" block>
                {t.header.saved}
              </ButtonLink>
            </div>
          </Container>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function SiteHeader() {
  const { t } = useI18n();
  const pathname = usePathname();
  const scrolled = useScrolled(24);
  const active = useIsActive();

  return (
    <header
      className={cn(
        "sticky top-0 z-100 border-b bg-bg/90 backdrop-blur-header backdrop-saturate-180 print:hidden",
        "[transition:box-shadow_var(--duration-normal)_var(--ease-in-out),border-color_var(--duration-normal)_var(--ease-in-out),background-color_var(--duration-normal)_var(--ease-in-out)]",
        scrolled ? "border-strong shadow-raised" : "border-border",
      )}
    >
      <Container
        className={cn(
          "flex items-center gap-6 transition-[height] duration-240 ease-out",
          scrolled ? "h-header-compact" : "h-header",
        )}
      >
        <HomeMark compact={scrolled} />
        <nav className="ms-8 flex items-stretch gap-6 self-stretch max-lg:hidden" aria-label={t.a11y.sections}>
          {primaryNav.map((item) => (
            <Link key={item.key} href={item.href} aria-current={active(item.href) ? "page" : undefined} className={SECTION_LINK}>
              {t.nav[item.key]}
            </Link>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-2">
          <HeaderSearch />
          <ThemeToggle />
          <ButtonLink href={routes.signIn()} variant="ghost" size="sm" className="max-lg:hidden">
            {t.header.signIn}
          </ButtonLink>
          <ButtonLink href={routes.subscribe()} variant="primary" size="sm" className="max-lg:hidden">
            {t.header.subscribe}
          </ButtonLink>
          <MobileNav pathname={pathname} />
        </div>
      </Container>
    </header>
  );
}
