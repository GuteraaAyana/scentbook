// The two halves of a fragrance's profile on its page: what it smells like
// overall (accords) and the notes behind it, by layer.

type Accord = { name: string; color: string; strength: number };
type Note = { name: string; slug: string };

export function AccordBars({ accords }: { accords: Accord[] }) {
  if (accords.length === 0) return <p className="text-sm text-muted">No accords listed.</p>;
  return (
    <ul className="space-y-2.5">
      {accords.map((accord) => (
        <li key={accord.name} className="grid grid-cols-[7.5rem_1fr] items-center gap-3 text-sm">
          <span className="text-muted">{accord.name}</span>
          <span
            role="meter"
            aria-label={`${accord.name} strength`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={accord.strength}
            className="h-1.5 rounded-full bg-surface"
          >
            <span
              className="block h-full rounded-full"
              style={{ width: `${accord.strength}%`, backgroundColor: accord.color }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}

// Top notes are smelled first and fade soonest; base notes last longest. The
// paragraph above the tags tells that story; the tags are for scanning.
const layers = [
  { key: "top", label: "Top" },
  { key: "heart", label: "Heart" },
  { key: "base", label: "Base" },
] as const;

export function NoteTags({ notes }: { notes: Record<(typeof layers)[number]["key"], Note[]> }) {
  return (
    <dl className="space-y-3">
      {layers.map((layer) => (
        <div key={layer.key} className="grid grid-cols-[3.5rem_1fr] items-baseline gap-3">
          <dt className="text-sm font-bold text-muted">{layer.label}</dt>
          <dd className="flex flex-wrap gap-1.5">
            {notes[layer.key].length > 0 ? (
              notes[layer.key].map((note) => (
                <span key={note.slug} className="rounded bg-surface px-2 py-1 text-xs font-semibold">
                  {note.name}
                </span>
              ))
            ) : (
              <span className="text-sm text-muted">None listed</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
