/**
 * Loads the editorial content (authors, desks, topics, articles) from
 * backend/seed into the database. Safe to run repeatedly.
 *
 *   npm run seed:content
 */
import "dotenv/config";
import { connectDb, disconnectDb } from "../src/db/connect.js";
import { seedContent, seedPlacements } from "../src/modules/content/content.seed.js";

async function main(): Promise<void> {
  await connectDb();
  const report = await seedContent();
  const placed = await seedPlacements();
  console.log(
    `Seeded ${report.articles} articles, ${report.authors} authors, ${report.sections} sections, ${report.topics} topics.`,
  );
  console.log(placed ? "Front page placed as in the design export." : "Front page placement left as the editors set it.");
}

main()
  .then(() => disconnectDb())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Content seed failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
