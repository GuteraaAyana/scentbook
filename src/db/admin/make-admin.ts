// Make someone a moderator (or take it away): `npm run make-admin -- <username>`
// or `npm run make-admin -- <username> --remove`. Moderators see /admin/reports.
//
// Own connection, like the seed: `@/db` is server-only and won't load here.
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../schema";

config({ path: ".env.local" });

async function main() {
  const [username, flag] = process.argv.slice(2);
  if (!username || (flag && flag !== "--remove")) {
    console.error("Usage: npm run make-admin -- <username> [--remove]");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const db = drizzle(pool, { schema });
    const role = flag === "--remove" ? "member" : "admin";
    const updated = await db
      .update(schema.users)
      .set({ role })
      .where(eq(schema.users.username, username.toLowerCase()))
      .returning({ name: schema.users.name });
    if (updated.length === 0) {
      console.error(`No one has the username "${username}".`);
      process.exitCode = 1;
    } else {
      console.log(`${updated[0].name} (@${username.toLowerCase()}) is now ${role === "admin" ? "a moderator" : "a member"}.`);
    }
  } finally {
    await pool.end();
  }
}

main();
