// The database connection the rest of the app imports: `import { db } from "@/db"`.
// `server-only` makes the build fail if this file ever ends up in browser code,
// so the database URL can't leak to the client.
import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// A pool keeps a few connections open and reuses them, instead of opening a
// new one for every request.
//
// `next dev` re-runs this file after edits. Without the globalThis cache, each
// re-run would open a fresh pool and leak the old one's connections until
// Postgres refuses new ones ("too many clients already").
const globalForDb = globalThis as unknown as { pgPool?: Pool };

const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5, // at most 5 open connections per server process
    idleTimeoutMillis: 10_000, // close connections unused for 10s
    connectionTimeoutMillis: 5_000, // fail fast instead of hanging if the DB is down
  });

if (process.env.NODE_ENV !== "production") globalForDb.pgPool = pool;

export const db = drizzle(pool, { schema });
