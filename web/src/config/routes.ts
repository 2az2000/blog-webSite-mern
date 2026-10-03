/**
 * Every URL in the app is built here — never type a path string in a component.
 * One route per reference screen (blog-refrence/*.html), per DESIGN-HANDOFF.md.
 *
 *   index.html            → /
 *   article.html?a=       → /article/[slug]
 *   longform.html?a=      → /longform/[slug]
 *   category.html?s=      → /category/[slug]
 *   topic.html?t=         → /topic/[slug]
 *   author.html?a=        → /author/[slug]
 *   search.html?q=        → /search?q=
 *   trending.html         → /trending
 *   bookmarks.html        → /bookmarks
 *   newsletter.html       → /newsletter
 *   subscribe.html        → /subscribe
 *   auth.html#view        → /auth#signin|signup|forgot|reset|verify
 *   states.html           → /states
 *   design-system.html    → /design-system
 *   404.html              → app/not-found.tsx
 */
export const routes = {
  home: () => "/",
  article: (slug: string) => `/article/${encodeURIComponent(slug)}`,
  longform: (slug: string) => `/longform/${encodeURIComponent(slug)}`,
  category: (slug: string) => `/category/${encodeURIComponent(slug)}`,
  topic: (slug: string) => `/topic/${encodeURIComponent(slug)}`,
  author: (slug: string) => `/author/${encodeURIComponent(slug)}`,
  search: (q?: string) => (q ? `/search?q=${encodeURIComponent(q)}` : "/search"),
  trending: () => "/trending",
  bookmarks: () => "/bookmarks",
  newsletter: () => "/newsletter",
  subscribe: () => "/subscribe",
  signIn: () => "/auth",
  signUp: () => "/auth#signup",
  states: () => "/states",
  designSystem: () => "/design-system",
  /** The reference points every "about/contact/legal" link at index.html#about. */
  about: () => "/#about",
} as const;
