import Link from "next/link";
import type { listWears } from "@/db/wears";
import { DeleteWearButton } from "./delete-wear-button";
import { Poster } from "./poster";

type Entry = Awaited<ReturnType<typeof listWears>>[number];

const weekday = new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" });
const shortDate = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });

// One diary entry: the day, the fragrance, and the details you logged.
// `editable` adds the delete button and the note (your own diary only):
// notes can be personal, so public profiles never show them.
export function WearEntry({ entry, editable = false, showMonth = false }: { entry: Entry; editable?: boolean; showMonth?: boolean }) {
  const date = new Date(`${entry.wornOn}T00:00:00Z`);
  const details = [
    entry.occasion,
    [entry.weather, entry.temperatureC != null ? `${entry.temperatureC}°C` : null].filter(Boolean).join(", "),
    entry.compliments > 0 ? `${entry.compliments} ${entry.compliments === 1 ? "compliment" : "compliments"}` : null,
  ].filter(Boolean);

  return (
    <li className="grid grid-cols-[2.75rem_2.75rem_minmax(0,1fr)] gap-3 py-4 sm:grid-cols-[3.5rem_3rem_minmax(0,1fr)] sm:gap-4">
      <time dateTime={entry.wornOn} className="text-center leading-tight">
        <span className="block text-xs font-bold text-muted">{weekday.format(date)}</span>
        <span className="block text-2xl font-extrabold">{showMonth ? shortDate.format(date) : date.getUTCDate()}</span>
      </time>
      <Link href={`/fragrances/${entry.slug}`} aria-hidden="true" tabIndex={-1}>
        <Poster name={entry.name} imageUrl={entry.imageUrl} accords={entry.accords} sizes="3rem" />
      </Link>
      <div className="min-w-0">
        <Link href={`/fragrances/${entry.slug}`} className="font-bold hover:underline hover:underline-offset-4">
          {entry.name}
        </Link>
        <span className="text-sm text-muted"> {entry.brand}</span>
        {details.length > 0 && (
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {details.map((d) => (
              <li key={d} className="rounded bg-surface px-2 py-0.5 text-xs font-semibold">
                {d}
              </li>
            ))}
          </ul>
        )}
        {editable && entry.note && <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">{entry.note}</p>}
        {editable && (
          <div className="mt-2">
            <DeleteWearButton wearId={entry.wearId} />
          </div>
        )}
      </div>
    </li>
  );
}
