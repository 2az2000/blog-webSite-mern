/*
 * Primitives — the smallest building blocks. They know nothing about content,
 * data or pages. Everything above (components, blocks, features, app) is
 * composed from these.
 */
export * from "./badge/badge";
export * from "../ui/button";
export * from "./form/form";
export * from "./icon/icons";
export * from "./layout/layout";
export { gapClass, spaceClass } from "./layout/space";
export type { Space, SpaceProps } from "./layout/space";
export * from "./typography/typography";
