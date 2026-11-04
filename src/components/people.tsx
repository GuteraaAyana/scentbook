import Link from "next/link";
import type { getFeed } from "@/db/follows";
import { timeAgo } from "@/lib/feed";
import { Poster } from "./poster";

type Person = { name: string; username: string | null; bio?: string | null };

export function Avatar({ name, className = "size-9 text-sm" }: { name: string; className?: string }) {
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-full bg-raised font-extrabold ${className}`}>
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

// People as rows: initial, name and @username, a line of bio.
export function PersonList({ people, empty }: { people: Person[]; empty: string }) {
  if (people.length === 0) return <p className="mt-4 text-muted">{empty}</p>;
  return (
    <ul className="divide-y divide-line">
      {people.map((person) => (
        <li key={person.username}>
          <Link href={`/u/${person.username}`} className="group flex items-center gap-3 py-3">
            <Avatar name={person.name} />
            <span className="min-w-0">
              <span className="block font-bold group-hover:underline group-hover:underline-offset-4">{person.name}</span>
              <span className="block truncate text-sm text-muted">
                @{person.username}
                {person.bio && <> {person.bio}</>}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

type FeedItem = Awaited<ReturnType<typeof getFeed>>["items"][number];

const statusVerb = { have: "added", want: "wants", had: "used to own" } as const;
const statusEnd = { have: " to their shelf", want: "", had: "" } as const;

// One line of activity: who did what to which fragrance, and when.
export function FeedEntry({ item }: { item: FeedItem }) {
  const who = item.person.username ? (
    <Link href={`/u/${item.person.username}`} className="font-bold hover:underline hover:underline-offset-4">
      {item.person.name}
    </Link>
  ) : (
    <b>{item.person.name}</b>
  );
  const what = (
    <Link href={`/fragrances/${item.fragrance.slug}`} className="font-bold hover:underline hover:underline-offset-4">
      {item.fragrance.name}
    </Link>
  );

  let sentence;
  if (item.kind === "ranked") sentence = <>{who} ranked {what}</>;
  else if (item.kind === "wore") sentence = <>{who} wore {what}</>;
  else if (item.kind === "reviewed") sentence = <>{who} reviewed {what}</>;
  else sentence = <>{who} {statusVerb[item.status!]} {what}{statusEnd[item.status!]}</>;

  return (
    <li className="grid grid-cols-[2.25rem_minmax(0,1fr)_2.75rem] gap-3 py-4">
      <Avatar name={item.person.name} />
      <div className="min-w-0">
        <p className="leading-snug">
          {sentence}
          {item.score != null && <span className="ml-1.5 font-extrabold text-gold">{item.score}</span>}
        </p>
        <p className="mt-0.5 text-xs text-muted">
          {item.fragrance.brand}, <time dateTime={item.at.toISOString()}>{timeAgo(item.at)}</time>
        </p>
        {item.occasion && <span className="mt-2 inline-block rounded bg-surface px-2 py-0.5 text-xs font-semibold">{item.occasion}</span>}
        {item.excerpt && <p className="mt-2 line-clamp-3 max-w-prose text-sm leading-relaxed text-muted">{item.excerpt}</p>}
      </div>
      <Link href={`/fragrances/${item.fragrance.slug}`} tabIndex={-1} aria-hidden="true">
        <Poster name={item.fragrance.name} imageUrl={item.fragrance.imageUrl} accords={item.fragrance.accords} sizes="2.75rem" />
      </Link>
    </li>
  );
}
