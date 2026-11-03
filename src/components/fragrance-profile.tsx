// The two halves of a fragrance's profile on its page: what it smells like
// overall (accords) and how it changes on skin over time (notes).

type Accord = { name: string; color: string; strength: number };
type Note = { name: string; slug: string };

export function AccordBars({ accords }: { accords: Accord[] }) {
  if (accords.length === 0) return <p className="text-sm text-muted">No accords listed.</p>;
  return (
    <ul className="space-y-3">
      {accords.map((accord) => (
        <li key={accord.name} className="grid grid-cols-[8rem_1fr] items-center gap-4 text-sm sm:grid-cols-[10rem_1fr]">
          <span>{accord.name}</span>
          <span
            role="meter"
            aria-label={`${accord.name} strength`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={accord.strength}
            className="h-1.5 rounded-full bg-raised"
          >
            <span
              className="block h-full rounded-full"
              style={{
                width: `${accord.strength}%`,
                backgroundColor: accord.color,
                boxShadow: `0 0 12px color-mix(in oklab, ${accord.color} 55%, transparent)`,
              }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}

// Top notes are what you smell first and fade soonest; base notes last
// longest. That's a real sequence, so it's drawn as a timeline.
const stages = [
  { key: "top", label: "Top", when: "First 15 minutes" },
  { key: "heart", label: "Heart", when: "The next few hours" },
  { key: "base", label: "Base", when: "Into the evening" },
] as const;

export function NoteTimeline({ notes }: { notes: Record<(typeof stages)[number]["key"], Note[]> }) {
  return (
    <ol className="relative grid gap-8 sm:grid-cols-3 sm:gap-6">
      {/* The line the stages sit on: down the left on phones, across on wider screens. */}
      <span aria-hidden="true" className="absolute top-2 bottom-2 left-[5px] w-px bg-line sm:top-[5px] sm:right-0 sm:bottom-auto sm:left-0 sm:h-px sm:w-auto" />
      {stages.map((stage) => (
        <li key={stage.key} className="relative pl-7 sm:pt-7 sm:pl-0">
          <span aria-hidden="true" className="absolute top-1 left-0 size-[11px] rounded-full border border-brass bg-background sm:top-0" />
          <h3 className="font-medium">{stage.label}</h3>
          <p className="text-sm text-muted">{stage.when}</p>
          {notes[stage.key].length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {notes[stage.key].map((note) => (
                <li key={note.slug} className="rounded-full bg-raised px-3 py-1 text-sm">
                  {note.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">None listed</p>
          )}
        </li>
      ))}
    </ol>
  );
}
