import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ModerateButtons } from "@/components/moderate-buttons";
import { isAdmin, listHiddenReviews, listReportedReviews } from "@/db/moderation";
import { auth } from "@/lib/auth";
import { timeAgo } from "@/lib/feed";
import { REPORT_REASONS } from "@/lib/moderation";
import { pageContainer, rowHeading } from "@/lib/ui";

export const metadata: Metadata = { title: "Reports · Scentbook", robots: { index: false } };

const reasonLabel = Object.fromEntries(REPORT_REASONS.map((r) => [r.value, r.label]));

export default function ReportsPage() {
  return (
    <main className={`${pageContainer} flex-1 py-8 sm:py-10`}>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Reports />
      </Suspense>
    </main>
  );
}

async function Reports() {
  await connection();
  const session = await auth.api.getSession({ headers: await headers() });
  // Not a moderator: as far as you can tell, there's no such page.
  if (!session || !(await isAdmin(session.user.id))) notFound();

  const [reported, hidden] = await Promise.all([listReportedReviews(), listHiddenReviews()]);
  const now = new Date();

  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Reports</h1>
      <p className="mt-3 max-w-xl text-muted">
        Reviews members have reported. One reported by three people is hidden until you decide. Hiding closes its
        reports; keeping it up dismisses them and undoes an automatic hide.
      </p>

      <section className="mt-8" aria-labelledby="open-heading">
        <h2 id="open-heading" className={rowHeading}>
          <span>Waiting for a decision</span>
          <span>{reported.length}</span>
        </h2>
        {reported.length === 0 ? (
          <p className="mt-4 text-muted">Nothing reported. All quiet.</p>
        ) : (
          <ol className="divide-y divide-line">
            {reported.map((review) => (
              <li key={review.id} className="grid gap-3 py-5">
                <ReviewHeader review={review} now={now} />
                <ul className="grid gap-1.5 text-sm">
                  {review.reports.map((report, i) => (
                    <li key={i} className="rounded-md bg-surface px-3 py-2">
                      <span className="font-bold">{reasonLabel[report.reason]}</span>
                      <span className="text-muted"> · {timeAgo(report.createdAt, now)}</span>
                      {report.details && <p className="mt-1 text-muted">{report.details}</p>}
                    </li>
                  ))}
                </ul>
                <ModerateButtons reviewId={review.id} decisions={["hide", "dismiss"]} />
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="mt-10" aria-labelledby="hidden-heading">
        <h2 id="hidden-heading" className={rowHeading}>
          <span>Hidden by a moderator</span>
          <span>{hidden.length}</span>
        </h2>
        {hidden.length === 0 ? (
          <p className="mt-4 text-muted">No hidden reviews.</p>
        ) : (
          <ol className="divide-y divide-line">
            {hidden.map((review) => (
              <li key={review.id} className="grid gap-3 py-5">
                <ReviewHeader review={review} now={now} />
                <ModerateButtons reviewId={review.id} decisions={["restore"]} />
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}

function ReviewHeader({
  review,
  now,
}: {
  review: {
    body: string;
    createdAt: Date;
    hiddenAt: Date | null;
    hiddenReason: string | null;
    authorName: string;
    authorUsername: string | null;
    fragranceName: string;
    fragranceSlug: string;
  };
  now: Date;
}) {
  return (
    <div>
      <p className="text-sm text-muted">
        {review.authorUsername ? (
          <Link href={`/u/${review.authorUsername}`} className="font-bold text-foreground hover:underline">
            {review.authorName}
          </Link>
        ) : (
          <span className="font-bold text-foreground">{review.authorName}</span>
        )}{" "}
        on{" "}
        <Link href={`/fragrances/${review.fragranceSlug}`} className="font-bold text-foreground hover:underline">
          {review.fragranceName}
        </Link>{" "}
        · {timeAgo(review.createdAt, now)}
        {review.hiddenAt && (
          <span className="ml-2 rounded-sm bg-raised px-1.5 py-0.5 text-xs font-bold text-foreground">
            {review.hiddenReason === "reports" ? "Hidden automatically" : "Hidden"}
          </span>
        )}
      </p>
      <p className="mt-2 max-w-prose leading-relaxed whitespace-pre-line">{review.body}</p>
    </div>
  );
}
