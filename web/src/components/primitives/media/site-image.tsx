"use client";

import Image, { type ImageProps } from "next/image";

import cloudinaryLoader, { cloudinaryUrl } from "@/lib/image-loader";

/**
 * `next/image` with one difference: a picture hosted on Cloudinary is sized and
 * re-encoded (AVIF, WebP or JPEG, whichever the browser accepts) by Cloudinary
 * itself, not by this site's image optimizer. Everything else (the pictures in
 * /public) keeps Next's own optimizer. `srcset`, `sizes`, lazy loading and the
 * layout-shift guard from `width`/`height` all work as for any `next/image`.
 *
 * It is a Client Component because a loader is a function, and a function cannot
 * be passed from a Server Component to `next/image`.
 */
export function SiteImage(props: ImageProps) {
  const hosted = typeof props.src === "string" && cloudinaryUrl(props.src, 1) !== null;
  // eslint-disable-next-line jsx-a11y/alt-text -- `alt` is a required prop of ImageProps and arrives in the spread
  return <Image {...props} loader={hosted ? cloudinaryLoader : undefined} />;
}
