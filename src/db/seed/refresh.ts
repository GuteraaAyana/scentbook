// After the catalog changes, ask a running Scentbook server to drop its cached
// catalog pages (src/app/api/revalidate). Best effort: if no server is running,
// there's nothing cached to clear, and the next build picks up the data anyway.
export async function refreshRunningServer() {
  const url = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return;
  try {
    const res = await fetch(`${url}/api/revalidate`, {
      method: "POST",
      headers: { "x-revalidate-secret": secret },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) console.log(`Refreshed the catalog on ${url}.`);
    else console.log(`Couldn't refresh ${url} (status ${res.status}); restart npm run dev to see changes.`);
  } catch {
    // No server running.
  }
}
