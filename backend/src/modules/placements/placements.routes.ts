/** The front page's placement, as readers get it. CDN-cacheable like the rest of the public read API. */
import { Router } from "express";
import { publicCache } from "../../http/cache.js";
import { sweepDue } from "../admin/articles.service.js";
import { getHome } from "./placements.service.js";

export const placementsRouter: Router = Router();

placementsRouter.get("/placements/home", publicCache, async (_req, res) => {
  await sweepDue().catch(() => undefined); // a scheduled story may be due to lead
  res.json({ data: await getHome() });
});
