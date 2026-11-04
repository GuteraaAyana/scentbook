import { headers } from "next/headers";
import Link from "next/link";
import { connection } from "next/server";
import { getWearSummary } from "@/db/wears";
import { auth } from "@/lib/auth";
import { LogWearFlow } from "./log-wear-flow";

const dayFormat = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

// "Log a wear" on a fragrance page, with how often you've worn it. Per
// visitor, so rendered per request inside <Suspense>.
export async function WearControl({ fragranceId, fragranceName }: { fragranceId: number; fragranceName: string }) {
  await connection();
  const session = await auth.api.getSession({ headers: await headers() });
  // Signed out: the ranking control beside this already asks you to sign in.
  if (!session) return null;

  const { times, last } = await getWearSummary(session.user.id, fragranceId);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <LogWearFlow fragranceId={fragranceId} fragranceName={fragranceName} />
      {times > 0 && last && (
        <Link href="/diary" className="text-sm text-muted hover:text-foreground">
          Worn {times === 1 ? "once" : `${times} times`}, last on {dayFormat.format(new Date(`${last}T00:00:00Z`))}
        </Link>
      )}
    </div>
  );
}

// Nothing while loading, for the same reason as CollectionControlSkeleton.
export function WearControlSkeleton() {
  return null;
}
