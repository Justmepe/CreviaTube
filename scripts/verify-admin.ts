// One-off verification helper. Confirms the seeded admin row has
// role='admin', status='active', and that the stored password hash
// matches the supplied plaintext (scrypt with the format auth.ts
// expects). Not shipped — call once after seeding and delete.

import { promisify } from "util";
import { scrypt, timingSafeEqual } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../backend/db";
import { users } from "../shared/schema";

const scryptAsync = promisify(scrypt);

async function main() {
  const username = process.argv[2] ?? "admin";
  const password = process.argv[3] ?? "";

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user) {
    console.error(`User '${username}' not found.`);
    process.exit(1);
  }

  console.log(`user: ${user.username}`);
  console.log(`  role:           ${user.role}`);
  console.log(`  status:         ${user.status}`);
  console.log(`  emailVerified:  ${user.emailVerified}`);
  console.log(`  isActive:       ${user.isActive}`);

  if (!password) {
    console.log("\n(pass a password as the 2nd arg to verify the hash)");
    process.exit(0);
  }

  const [hashed, salt] = user.password.split(".");
  const stored = Buffer.from(hashed, "hex");
  const test = (await scryptAsync(password, salt, 64)) as Buffer;
  const matches = stored.length === test.length && timingSafeEqual(stored, test);
  console.log(`  password OK?    ${matches}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
