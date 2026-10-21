// Settings for drizzle-kit, the command-line tool that turns src/db/schema.ts
// into SQL migration files (in /drizzle) and applies them to the database.
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
