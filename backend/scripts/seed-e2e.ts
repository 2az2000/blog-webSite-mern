/**
 * The four accounts the browser tests (web/e2e) sign in as. Never for production:
 * they have a published password.
 *
 *   npm run seed:e2e
 *
 * Idempotent. Also links the writer to a byline, so the writer can start an article.
 */
import "dotenv/config";
import { env } from "../src/config/env.js";
import { connectDb, disconnectDb } from "../src/db/connect.js";
import { AuthorModel } from "../src/models/author.model.js";
import { UserModel, hashPassword, type Role } from "../src/models/user.model.js";

export const E2E_PASSWORD = "Passw0rd!x";
const ACCOUNTS: { email: string; name: string; role: Role }[] = [
  { email: "e2e-reader@example.com", name: "E2E Reader", role: "reader" },
  { email: "e2e-writer@example.com", name: "E2E Writer", role: "writer" },
  { email: "e2e-editor@example.com", name: "E2E Editor", role: "editor" },
  { email: "e2e-admin@example.com", name: "E2E Admin", role: "admin" },
];

async function main(): Promise<void> {
  if (env.isProd) throw new Error("seed:e2e creates accounts with a published password: not in production");
  await connectDb();
  const passwordHash = await hashPassword(E2E_PASSWORD);
  for (const a of ACCOUNTS) {
    const user = await UserModel.findOneAndUpdate(
      { email: a.email },
      { $set: { name: a.name, role: a.role, status: "active", emailVerified: true, passwordHash } },
      { upsert: true, returnDocument: "after" },
    );
    if (a.role === "writer") {
      await AuthorModel.updateOne(
        { slug: "e2e-writer" },
        { $set: { name: a.name, initials: "EW", role: "Reporter", since: 2026, bio: "Writes the browser tests' stories.", userId: user._id } },
        { upsert: true },
      );
    }
  }
  console.log(`E2E accounts ready (password ${E2E_PASSWORD}): ${ACCOUNTS.map((a) => a.email).join(", ")}`);
}

main()
  .then(() => disconnectDb())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("E2E seed failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
