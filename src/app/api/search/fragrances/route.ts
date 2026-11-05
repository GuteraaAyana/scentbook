// The fragrance search index (src/db/fragrances.ts getSearchIndex) as JSON,
// loaded by the search box the first time it's used.
import { getSearchIndex } from "@/db/fragrances";

export async function GET() {
  const index = await getSearchIndex();
  return Response.json(index, {
    // Browsers may reuse it for a minute; the server's copy is refreshed
    // whenever the catalog or scores change.
    headers: { "Cache-Control": "public, max-age=60" },
  });
}
