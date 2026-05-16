// scripts/seed-admin.ts — mint a platform admin user.
//
// Run via:   npx tsx scripts/seed-admin.ts
//
// Reads credentials from env vars (preferred for prod) or CLI flags:
//
//   ADMIN_USERNAME=peter \
//   ADMIN_EMAIL=peter@creviatube.com \
//   ADMIN_PASSWORD='please-change-me' \
//   ADMIN_FULL_NAME='Peter Admin' \
//   npx tsx scripts/seed-admin.ts
//
// or:
//
//   npx tsx scripts/seed-admin.ts \
//     --username peter \
//     --email peter@creviatube.com \
//     --password 'please-change-me' \
//     --name 'Peter Admin'
//
// Idempotent: re-running with the same username updates the existing
// row in-place (resets password to the supplied one, ensures role
// stays 'admin'). Re-running with a different username creates a
// second admin.
//
// Bypasses insertUserSchema deliberately — that schema (intentionally)
// omits the `role` column to lock down the public signup endpoint, so
// the seed has to talk to Drizzle directly.

import { eq } from "drizzle-orm";
import { randomBytes, scrypt } from "crypto";
import { promisify } from "util";
import { db } from "../backend/db";
import { users } from "../shared/schema";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

interface SeedConfig {
  username: string;
  email: string;
  password: string;
  fullName: string;
}

function parseArgs(): Partial<SeedConfig> {
  const out: Partial<SeedConfig> = {};
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    const value = args[i + 1];
    if (!value) continue;
    if (flag === "--username") out.username = value;
    else if (flag === "--email") out.email = value;
    else if (flag === "--password") out.password = value;
    else if (flag === "--name") out.fullName = value;
    else continue;
    i++;
  }
  return out;
}

function resolveConfig(): SeedConfig {
  const args = parseArgs();
  const config: SeedConfig = {
    username: args.username ?? process.env.ADMIN_USERNAME ?? "",
    email: args.email ?? process.env.ADMIN_EMAIL ?? "",
    password: args.password ?? process.env.ADMIN_PASSWORD ?? "",
    fullName: args.fullName ?? process.env.ADMIN_FULL_NAME ?? "",
  };
  const missing = (Object.keys(config) as Array<keyof SeedConfig>).filter(
    (k) => !config[k],
  );
  if (missing.length > 0) {
    console.error(
      `\nMissing required values: ${missing.join(", ")}\n\n` +
        "Set via env vars (ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD,\n" +
        "ADMIN_FULL_NAME) or CLI flags (--username, --email, --password,\n" +
        "--name).\n",
    );
    process.exit(1);
  }
  if (config.password.length < 12) {
    console.error("Password must be at least 12 characters.");
    process.exit(1);
  }
  if (!config.email.includes("@")) {
    console.error("Email looks invalid.");
    process.exit(1);
  }
  return config;
}

async function main(): Promise<void> {
  if (!db) {
    console.error("DATABASE_URL is not set — cannot seed admin.");
    process.exit(1);
  }

  const config = resolveConfig();
  const hashedPassword = await hashPassword(config.password);

  // Upsert by username. We don't ON CONFLICT because we want to be
  // explicit about which fields we overwrite on existing rows (just
  // password, role, email, full name — not the rest of the user's
  // state).
  const existing = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.username, config.username))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(users)
      .set({
        password: hashedPassword,
        email: config.email,
        fullName: config.fullName,
        role: "admin",
        status: "active",
        isActive: true,
        emailVerified: true, // skip verification gate for seeded admins
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing[0].id));
    console.log(`Updated existing user '${config.username}' → admin.`);
    console.log(`  id:    ${existing[0].id}`);
    console.log(`  email: ${config.email}`);
    return;
  }

  const [created] = await db
    .insert(users)
    .values({
      username: config.username,
      email: config.email,
      password: hashedPassword,
      fullName: config.fullName,
      role: "admin",
      status: "active",
      isActive: true,
      emailVerified: true,
    })
    .returning({ id: users.id });

  console.log(`Created admin '${config.username}'.`);
  console.log(`  id:    ${created.id}`);
  console.log(`  email: ${config.email}`);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
