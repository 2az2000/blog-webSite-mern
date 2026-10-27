/**
 * Bootstrap seeding. Creates the first admin from env (or prints a hint).
 * Editorial content is loaded separately: `npm run seed:content`.
 *
 *   npm run seed
 *   INITIAL_ADMIN_EMAIL=admin@example.com INITIAL_ADMIN_PASSWORD='S3cret!' npm run seed
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { env } from "../src/config/env.js";
import { connectDb, disconnectDb } from "../src/db/connect.js";
import { UserModel } from "../src/models/user.model.js";

async function main(): Promise<void> {
  await connectDb();

  const email = env.initialAdminEmail?.trim().toLowerCase();
  const password = env.initialAdminPassword;

  if (!email || !password) {
     
    console.log(
      "Nothing to seed: set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD to create the first admin.",
    );
    return;
  }

  const exists = await UserModel.findOne({ email });

  if (exists) {
     
    console.log(`Admin already exists: ${email} (role: ${exists.role})`);
    return;
  }

  if (password.length < 8) {
    throw new Error("INITIAL_ADMIN_PASSWORD must be at least 8 characters");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await UserModel.create({
    name: "NOVA Admin",
    email,
    passwordHash,
    role: "admin",
    emailVerified: true,
    status: "active",
  });

   
  console.log(`Created admin ${admin.email} (role: admin, verified: true) — change the password after first login.`);
}

main()
  .then(() => disconnectDb())
  .then(() => process.exit(0))
  .catch((err) => {
     
    console.error("Seed failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
