// Health check for the host's load balancer and uptime monitoring:
// 200 when the app can reach the database, 503 when it can't.
import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/db";

export async function GET() {
  await connection();
  try {
    await db.execute(sql`select 1`);
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    // Don't say why: the error could include connection details.
    return Response.json({ status: "database unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
