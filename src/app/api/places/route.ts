// City search for the place pickers (settings, Log a wear). Signed-in only,
// so it isn't an open proxy to the geocoding service.
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { searchPlaces } from "@/lib/places-server";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: "Sign in to search places." }, { status: 401 });

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 60) return Response.json({ places: [] });
  const places = await searchPlaces(q.toLowerCase());
  if (!places) return Response.json({ error: "Place search isn't answering. Try again." }, { status: 502 });
  return Response.json({ places }, { headers: { "Cache-Control": "private, max-age=3600" } });
}
