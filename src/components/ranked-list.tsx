import Link from "next/link";
import type { FragranceCardData } from "@/db/fragrances";
import { ScentCase } from "./scent-case";

export type RankedItem = Pick<FragranceCardData, "slug" | "name" | "brand" | "imageUrl" | "accords"> & {
  place: number;
  score: number;
};

// Ranked fragrances as numbered rows: place, bottle, name and brand, score.
// A real ranking, so it's an ordered list; `start` keeps the numbers going
// when one list is split into several (loved, fine, didn't like).
export function RankedList({ items }: { items: RankedItem[] }) {
  if (items.length === 0) return null;
  return (
    <ol start={items[0].place} className="divide-y divide-line">
      {items.map((item) => (
        <li key={item.slug}>
          <Link
            href={`/fragrances/${item.slug}`}
            className="group grid grid-cols-[2rem_4rem_1fr_auto] items-center gap-4 py-4 sm:grid-cols-[3rem_5rem_1fr_auto]"
          >
            <span className="font-display text-2xl text-muted">{item.place}</span>
            <ScentCase
              name={item.name}
              imageUrl={item.imageUrl}
              accords={item.accords}
              sizes="5rem"
              className="aspect-square"
            />
            <span className="min-w-0">
              <span className="font-display block truncate text-xl group-hover:underline group-hover:underline-offset-4">
                {item.name}
              </span>
              <span className="block truncate text-sm text-muted">{item.brand}</span>
            </span>
            <span className="font-display text-3xl" aria-label={`Score ${item.score} out of 10`}>
              {item.score}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
