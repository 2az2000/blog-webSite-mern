import { Router, type RequestHandler } from "express";
import mongoose from "mongoose";

/** Liveness — answers without touching the database, so it stays green when Mongo is down. */
export const liveness: RequestHandler = (_req, res) => {
  res.json({ data: { status: "ok" } });
};

/** Readiness — pings MongoDB (cheap `admin` roundtrip). Mounted after the DB middleware. */
export const healthRouter: Router = Router();

healthRouter.get("/db", async (_req, res) => {
  try {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) throw new Error("not connected");
    await mongoose.connection.db.admin().ping();
    res.json({ data: { status: "ok", db: "ok" } });
  } catch {
    res.status(503).json({ error: { code: "DB_UNAVAILABLE", message: "Database is not reachable" } });
  }
});
