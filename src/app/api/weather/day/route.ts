// The weather on a given day at a given place, for filling in Log a wear.
// Signed-in only, so it isn't an open proxy to the weather service.
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { weatherOnDay } from "@/lib/weather";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: "Sign in first." }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  const date = params.get("date") ?? "";
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  if (
    !Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lon) || Math.abs(lon) > 180 ||
    !DATE.test(date) || date < "1940-01-01" || date > tomorrow
  ) {
    return Response.json({ error: "Unknown place or date." }, { status: 400 });
  }
  const weather = await weatherOnDay(lat, lon, date, today);
  if (!weather) return Response.json({ error: "No weather for that day." }, { status: 404 });
  return Response.json(weather, { headers: { "Cache-Control": "private, max-age=3600" } });
}
