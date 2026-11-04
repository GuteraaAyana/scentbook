import { headers } from "next/headers";
import Link from "next/link";
import { connection } from "next/server";
import { listCollection } from "@/db/collections";
import { listRankings } from "@/db/rankings";
import { listWears } from "@/db/wears";
import { auth } from "@/lib/auth";
import { primaryButton, rowHeading } from "@/lib/ui";
import { conditionFor, pickForToday } from "@/lib/wear-today";
import { currentWeather, findCity } from "@/lib/weather";
import { Poster } from "./poster";

const DAY_MS = 86_400_000;

// "What to wear today" on the home page: a pick from your shelf for your
// city's weather. Per visitor, so rendered per request inside <Suspense>.
export async function TodayPick() {
  await connection();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const userId = session.user.id;
  const city = session.user.city?.trim();
  const [collection, ranked, wears] = await Promise.all([listCollection(userId), listRankings(userId), listWears(userId, 60)]);
  const shelf = collection.have;

  let body;
  if (!city) {
    body = (
      <Prompt text="Add your city and you'll get a pick from your shelf for today's weather. Your city stays private." href="/settings" action="Add your city" />
    );
  } else if (shelf.length === 0) {
    body = <Prompt text="Mark the fragrances you own as Have it, and you'll get a pick for today's weather." href="/fragrances" action="Browse fragrances" />;
  } else {
    const place = await findCity(city);
    const weather = place ? await currentWeather(place.latitude, place.longitude) : null;

    if (!place || !weather) {
      body = (
        <p className="text-muted">
          {place ? `Couldn't get the weather for ${place.name} right now. Try again later.` : `Couldn't find "${city}". Check your city in `}
          {!place && (
            <Link href="/settings" className="font-bold text-gold underline underline-offset-4">
              settings
            </Link>
          )}
          {!place && "."}
        </p>
      );
    } else {
      const scores = new Map(ranked.map((r) => [r.slug, r.score]));
      const lastWorn = new Map<string, string>();
      for (const w of wears) if (!lastWorn.has(w.slug)) lastWorn.set(w.slug, w.wornOn);
      const today = Date.parse(new Date().toISOString().slice(0, 10));
      const daysSince = (slug: string) => {
        const worn = lastWorn.get(slug);
        return worn ? Math.round((today - Date.parse(worn)) / DAY_MS) : null;
      };

      const picks = pickForToday(
        shelf.map((f) => ({ ...f, yourScore: scores.get(f.slug) ?? null, daysSinceWorn: daysSince(f.slug) })),
        weather,
      );
      const [best, ...others] = picks;

      body = (
        <>
          <p className="text-muted">
            {weather.temperatureC}°C and {conditionFor(weather).toLowerCase()} in {place.name}.
          </p>
          <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Link href={`/fragrances/${best.slug}`} className="group grid grid-cols-[6rem_minmax(0,1fr)] gap-4">
              <Poster name={best.name} imageUrl={best.imageUrl} accords={best.accords} sizes="6rem" />
              <span className="self-center">
                <span className="text-sm text-muted">Wear</span>
                <span className="block text-2xl font-extrabold tracking-tight group-hover:underline group-hover:underline-offset-4">
                  {best.name}
                </span>
                <span className="block text-sm text-muted">{best.brand}</span>
                <span className="mt-2 block max-w-prose">{best.reason}</span>
              </span>
            </Link>
            {others.length > 0 && (
              <div>
                <p className="text-sm font-bold text-muted">Or</p>
                <ul className="mt-2 grid grid-cols-2 gap-3">
                  {others.slice(0, 2).map((f) => (
                    <li key={f.slug}>
                      <Link href={`/fragrances/${f.slug}`} className="group grid grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-3">
                        <Poster name={f.name} imageUrl={f.imageUrl} accords={f.accords} sizes="2.75rem" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold group-hover:underline group-hover:underline-offset-4">{f.name}</span>
                          <span className="block truncate text-xs text-muted">{f.brand}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      );
    }
  }

  return (
    <section className="mt-10" aria-labelledby="today-heading">
      <div className={rowHeading}>
        <h2 id="today-heading" className="text-base text-foreground">
          What to wear today
        </h2>
      </div>
      <div className="mt-4 rounded-lg bg-surface p-4 sm:p-5">{body}</div>
    </section>
  );
}

function Prompt({ text, href, action }: { text: string; href: string; action: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="max-w-prose text-muted">{text}</p>
      <Link href={href} className={primaryButton}>
        {action}
      </Link>
    </div>
  );
}
