/**
 * The image loader for pictures hosted on Cloudinary (used by `SiteImage`).
 *
 * Pictures uploaded through the back office live on Cloudinary, which resizes and
 * re-encodes on its own servers: a request for `w_{width},f_auto,q_auto` is answered
 * with the right size, as AVIF where the browser accepts it, WebP next, and JPEG
 * otherwise, from a CDN. `next/image` still writes the `srcset` and `sizes`, so
 * the browser picks among the widths; only the *source* of each width changes, and
 * the site's own image optimizer (a metered resource on a free host) is not used.
 *
 * Pictures in /public never come here: they keep Next's own optimizer.
 */
const CLOUDINARY = /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//;

type LoaderArgs = { src: string; width: number };

/** The Cloudinary address for `src` at `width`, or null when `src` is not one of ours. */
export function cloudinaryUrl(src: string, width: number): string | null {
  const match = CLOUDINARY.exec(src);
  if (!match) return null;
  // `c_limit` never enlarges a picture beyond its own size
  return `${match[0]}f_auto,q_auto,c_limit,w_${width}/${src.slice(match[0].length)}`;
}

export default function cloudinaryLoader({ src, width }: LoaderArgs): string {
  // `SiteImage` only hands this loader a Cloudinary address; anything else is returned untouched
  return cloudinaryUrl(src, width) ?? src;
}
