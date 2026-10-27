import { z } from "zod";
import { slugSchema } from "../content/content.schemas.js";
import { HOME_SLOTS, SLOT_ORDER } from "./placements.service.js";

const slot = (max: number) => z.array(slugSchema).max(max).default([]);

/** The whole set of pins for the front page; a slot left out is empty (filled automatically). */
export const homePlacementSchema = z
  .object(Object.fromEntries(SLOT_ORDER.map((s) => [s, slot(HOME_SLOTS[s].max)])) as Record<(typeof SLOT_ORDER)[number], ReturnType<typeof slot>>)
  // an editor may deliberately show a story in two places (the export's Brief and opinion column share one);
  // only listing it twice within one slot is a mistake
  .refine((v) => SLOT_ORDER.every((s) => new Set(v[s]).size === v[s].length), {
    message: "A story can be listed once in a slot",
  });

export type HomePlacementInput = z.infer<typeof homePlacementSchema>;
