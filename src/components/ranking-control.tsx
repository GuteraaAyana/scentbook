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
        <Link href={`/sign-in?next=/fragrances/${fragrance.slug}`} className="text-brass underline underline-offset-4">
          Sign in
        </Link>{" "}
        to rank it against everything else you&rsquo;ve tried.
      </p>
    );
  }

  const current = await getUserRanking(session.user.id, fragrance.id);

  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
      {current ? (
        <p className="flex items-baseline gap-3">
          <span className="font-display text-5xl leading-none">{current.score}</span>
          <span className="text-sm text-muted">
            {current.bucketSize === 1
              ? `Your score. The only one you ${bucketPhrases[current.sentiment]} so far.`
              : `Your score. ${ordinal(current.position)} of the ${current.bucketSize} you ${bucketPhrases[current.sentiment]}.`}
          </span>
        </p>
      ) : (
        <p className="text-sm text-muted">Tried it? Rank it to get your score out of 10.</p>
      )}
      <RankFlow fragrance={fragrance} current={current} />
    </div>
  );
}

export function RankingControlSkeleton() {
  return <div className="h-11 w-64 animate-pulse rounded-full bg-surface" />;
}
