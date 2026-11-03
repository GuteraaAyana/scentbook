import { headers } from "next/headers";
import Link from "next/link";
import { connection } from "next/server";
import { getUserRanking } from "@/db/rankings";
import { auth } from "@/lib/auth";
import { RankFlow } from "./rank-flow";

type Props = {
  fragrance: {
    id: number;
    slug: string;
    name: string;
    brand: string;
    imageUrl: string | null;
    accords: { name: string; color: string; strength: number }[];
  };
};

// Finishes "the ones you ..." for each bucket.
const bucketPhrases = { loved: "loved", fine: "found fine", disliked: "didn't like" } as const;

function ordinal(n: number) {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${suffix}`;
}

// Your score for this fragrance and the Rank it button. Per visitor, so the
// page renders it per request inside <Suspense>, like the collection buttons.
export async function RankingControl({ fragrance }: Props) {
  await connection();
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return (
      <p className="text-sm text-muted">
        <Link href={`/sign-in?next=/fragrances/${fragrance.slug}`} className="font-bold text-gold underline underline-offset-4">
          Sign in
        </Link>{" "}
        to rank it and add it to your collection.
      </p>
    );
  }

  const current = await getUserRanking(session.user.id, fragrance.id);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {current && (
        <p className="flex items-baseline gap-2" title={positionText(current)}>
          <span className="text-sm text-muted">Your score</span>
          <span className="text-2xl font-extrabold text-gold">{current.score}</span>
          <span className="sr-only">{positionText(current)}</span>
        </p>
      )}
      <RankFlow fragrance={fragrance} current={current} />
    </div>
  );
}

function positionText(current: NonNullable<Awaited<ReturnType<typeof getUserRanking>>>) {
  return current.bucketSize === 1
    ? `The only one you ${bucketPhrases[current.sentiment]} so far.`
    : `${ordinal(current.position)} of the ${current.bucketSize} you ${bucketPhrases[current.sentiment]}.`;
}

export function RankingControlSkeleton() {
  return <div className="h-10 w-28 animate-pulse rounded-md bg-surface" />;
}
