/* Every reference screen and the app route that reproduces it.
   `ref` is relative to ../blog-refrence and opened over file://. */
export const SCREENS = [
  { name: "home", route: "/", ref: "index.html" },
  { name: "article", route: "/article/context-software", ref: "article.html?a=context-software" },
  { name: "longform", route: "/longform/grid-rebuild", ref: "longform.html?a=grid-rebuild" },
  { name: "category", route: "/category/technology", ref: "category.html?s=technology" },
  { name: "topic", route: "/topic/artificial-intelligence", ref: "topic.html?t=artificial-intelligence" },
  { name: "author", route: "/author/duarte", ref: "author.html?a=duarte" },
  { name: "search", route: "/search", ref: "search.html" },
  { name: "trending", route: "/trending", ref: "trending.html" },
  { name: "bookmarks", route: "/bookmarks", ref: "bookmarks.html" },
  { name: "auth", route: "/auth", ref: "auth.html" },
  { name: "newsletter", route: "/newsletter", ref: "newsletter.html" },
  { name: "subscribe", route: "/subscribe", ref: "subscribe.html" },
  { name: "states", route: "/states", ref: "states.html" },
  { name: "design-system", route: "/design-system", ref: "design-system.html" },
  { name: "404", route: "/this-page-does-not-exist", ref: "404.html" },
];

export const WIDTHS = [360, 390, 430, 600, 820, 1024, 1366, 1440, 1920];

/** Accepts a screen name ("article") or a route ("/article/x"). */
export function resolveScreen(arg) {
  return SCREENS.find((s) => s.name === arg || s.route === arg) ?? { name: arg.replace(/\W+/g, "-"), route: arg };
}
