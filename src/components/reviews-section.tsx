import { headers } from "next/headers";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getFragranceReviews, getOwnReview } from "@/db/reviews";
import { auth } from "@/lib/auth";
import { LONGEVITY, SILLAGE, averageLabel } from "@/lib/review";
import { ReviewFlow } from "./review-flow";

const dayFormat = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" });

// The Reviews section of a fragrance page: averages, everyone's reviews
// (cached, the same for every visitor), and your own Write/Edit button
// (per request, inside <Suspense>).
export async function ReviewsSection({ fragranceId, fragranceName }: { fragranceId: number; fragranceName: string }) {
  const { total, longevity, sillage, reviews } = await getFragranceReviews(fragranceId);

  return (
    <section aria-labelledby="reviews-heading">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-2">
        <h2 id="reviews-heading" className="text-sm font-bold text-muted">
          Reviews{total > 0 && ` (${total})`}
        </h2>
        <Suspense fallback={<div className="h-10 w-32 animate-pulse rounded-md bg-surface" />}>
          <OwnReviewButton fragranceId={fragranceId} fragranceName={fragranceName} />
        </Suspense>
      </div>

      {(longevity || sillage) && (
        <dl className="mt-4 grid max-w-xl gap-3 sm:grid-cols-2">
          {[
            { label: "Lasts", average: longevity, labels: LONGEVITY },
            { label: "Projects", average: sillage, labels: SILLAGE },
          ].map(
            (m) =>
              m.average && (
                <div key={m.label} className="rounded-lg bg-surface p-3">
                  <dt className="text-sm text-muted">{m.label}</dt>
                  <dd className="font-bold">{averageLabel(m.labels, m.average)}</dd>
                  <dd className="mt-2 h-1.5 rounded-full bg-raised" aria-hidden="true">
                    <span className="block h-full rounded-full bg-gold" style={{ width: `${(m.average / 5) * 100}%` }} />
                  </dd>
                </div>
              ),
          )}
        </dl>
      )}

      {reviews.length === 0 ? (
        <p className="mt-4 text-muted">No reviews yet. Tried it? Yours would be the first.</p>
      ) : (
        <ol className="mt-2 divide-y divide-line">
          {reviews.map((review) => (
            <li key={review.id} className="py-5">
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                {review.username ? (
                  <Link href={`/u/${review.username}`} className="font-bold hover:underline hover:underline-offset-4">
                    {review.name}
                  </Link>
                ) : (
                  <span className="font-bold">{review.name}</span>
                )}
                {review.score != null && (
                  <span className="font-extrabold text-gold">
                    {review.score}
                    <span className="sr-only"> out of 10</span>
                  </span>
                )}
                <span className="text-muted">
                  {dayFormat.format(review.createdAt)}
                  {review.updatedAt && ", edited"}
                </span>
              </p>
              {(review.longevity || review.sillage) && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {review.longevity && (
                    <li className="rounded bg-surface px-2 py-0.5 text-xs font-semibold">Lasts: {LONGEVITY[review.longevity - 1]}</li>
                  )}
                  {review.sillage && (
                    <li className="rounded bg-surface px-2 py-0.5 text-xs font-semibold">Projects: {SILLAGE[review.sillage - 1]}</li>
                  )}
                </ul>
              )}
              <p className="mt-2 max-w-prose leading-relaxed whitespace-pre-line">{review.body}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

async function OwnReviewButton({ fragranceId, fragranceName }: { fragranceId: number; fragranceName: string }) {
  await connection();
  const session = await auth.api.getSession({ headers: await headers() });
  // Signed out: the sign-in prompt at the top of the page covers this.
  if (!session) return null;
  const existing = await getOwnReview(session.user.id, fragranceId);
  return <ReviewFlow fragranceId={fragranceId} fragranceName={fragranceName} existing={existing} />;
}
