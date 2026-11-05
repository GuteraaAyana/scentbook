"use client";

import { useActionState, useMemo, useState } from "react";
import { type AddFragranceState, addFragrance } from "@/lib/actions/catalog";
import {
  CONCENTRATIONS,
  type Catalog,
  type FragranceDraft,
  GENDERS,
  catalogIndex,
  matchName,
  nameKey,
  parseAccords,
  parsePyramidSentence,
  splitList,
} from "@/lib/catalog-entry";
import { concentrationLabels, genderLabels } from "@/lib/labels";
import { primaryButton, rowHeading, secondaryButton, textField } from "@/lib/ui";

type Names = {
  brands: { name: string; country: string | null }[];
  notes: string[];
  accords: { name: string; color: string }[];
  perfumers: string[];
};

const EMPTY: FragranceDraft = {
  brand: "",
  brandCountry: "",
  name: "",
  releaseYear: "",
  concentration: "edp",
  gender: "unisex",
  perfumers: "",
  top: "",
  heart: "",
  base: "",
  accords: "",
  description: "",
  imageUrl: "",
};

const label = "block text-sm font-bold";
const hint = "mt-1.5 block text-sm font-normal text-muted";
const errorText = "mt-1.5 block text-sm text-danger";

// The moderator's form for adding a fragrance. Every list is matched against
// the catalog as you type: names it already has are ticked (and saved with the
// catalog's spelling), new ones are marked, and likely typos get a "did you
// mean". The server repeats all of it when you save.
export function AddFragranceForm({ names }: { names: Names }) {
  const [draft, setDraft] = useState<FragranceDraft>(EMPTY);
  const [sentence, setSentence] = useState("");
  const [sentenceError, setSentenceError] = useState<string | null>(null);
  const [colors, setColors] = useState<Record<string, string>>({});
  const [state, save, pending] = useActionState<AddFragranceState, FormData>(addFragrance, {
    errors: {},
    message: null,
    attempt: 0,
  });
  const { errors } = state;

  const catalogs = useMemo(
    () => ({
      brands: catalogIndex(names.brands.map((b) => b.name)),
      notes: catalogIndex(names.notes),
      accords: catalogIndex(names.accords.map((a) => a.name)),
      perfumers: catalogIndex(names.perfumers),
    }),
    [names],
  );
  const accordColors = useMemo(() => new Map(names.accords.map((a) => [a.name, a.color])), [names]);

  const set = (field: keyof FragranceDraft) => (value: string) => setDraft((d) => ({ ...d, [field]: value }));
  const bind = (field: keyof FragranceDraft) => ({
    name: field,
    value: draft[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      set(field)(e.target.value),
  });
  // Swap one item of a list field for the suggested catalog name.
  const replaceIn = (field: keyof FragranceDraft) => (from: string, to: string) =>
    set(field)(
      splitList(draft[field])
        .map((item) => (item === from ? to : item))
        .join(", "),
    );

  const brandMatch = draft.brand.trim() ? matchName(draft.brand, catalogs.brands) : null;
  const accordMatches = parseAccords(draft.accords).map((a) => ({ ...matchName(a.name, catalogs.accords), strength: a.strength }));

  // What saving will create, for the summary above the button.
  const newNames = (text: string, catalog: Catalog) =>
    splitList(text)
      .map((n) => matchName(n, catalog))
      .filter((m) => m.kind === "new")
      .map((m) => m.name);
  const created = {
    brand: brandMatch?.kind === "new" ? brandMatch.name : null,
    perfumers: newNames(draft.perfumers, catalogs.perfumers),
    notes: [...new Set([draft.top, draft.heart, draft.base].flatMap((t) => newNames(t, catalogs.notes)))],
    accords: accordMatches.filter((m) => m.kind === "new").map((m) => m.name),
  };

  function fillFromSentence() {
    const pyramid = parsePyramidSentence(sentence);
    if (!pyramid) {
      setSentenceError("Couldn't find 'Top notes are …' in that. Fill the three boxes below instead.");
      return;
    }
    setSentenceError(null);
    setDraft((d) => ({
      ...d,
      top: pyramid.top.join(", "),
      heart: pyramid.heart.join(", "),
      base: pyramid.base.join(", "),
    }));
  }

  return (
    <form action={save} className="mt-8 grid max-w-3xl gap-10" noValidate>
      <section className="grid gap-5">
        <h2 className={rowHeading}>The fragrance</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className={label}>
            House
            <input {...bind("brand")} list="known-brands" required autoComplete="off" className={textField} />
            <datalist id="known-brands">
              {names.brands.map((b) => (
                <option key={b.name} value={b.name} />
              ))}
            </datalist>
            {errors.brand ? (
              <span className={errorText}>{errors.brand}</span>
            ) : (
              brandMatch && <MatchLine match={brandMatch} onUse={(to) => set("brand")(to)} what="house" />
            )}
          </label>
          {brandMatch?.kind === "new" && (
            <label className={label}>
              Country of the new house <span className="font-normal text-muted">(optional)</span>
              <input {...bind("brandCountry")} autoComplete="off" className={textField} />
            </label>
          )}
        </div>

        <label className={label}>
          Name
          <input {...bind("name")} required autoComplete="off" placeholder="Stronger With You Intensely" className={textField} />
          <span className={errors.name ? errorText : hint}>
            {errors.name ?? "Without the house. Add the version if the house sells several (“… Parfum”)."}
          </span>
        </label>

        <div className="grid gap-5 sm:grid-cols-3">
          <label className={label}>
            Concentration
            <select {...bind("concentration")} className={textField}>
              {CONCENTRATIONS.map((c) => (
                <option key={c} value={c}>
                  {concentrationLabels[c] ?? "Other"}
                </option>
              ))}
            </select>
            {errors.concentration && <span className={errorText}>{errors.concentration}</span>}
          </label>
          <label className={label}>
            For
            <select {...bind("gender")} className={textField}>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {genderLabels[g]}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Year <span className="font-normal text-muted">(optional)</span>
            <input {...bind("releaseYear")} inputMode="numeric" autoComplete="off" className={textField} />
            {errors.releaseYear && <span className={errorText}>{errors.releaseYear}</span>}
          </label>
        </div>

        <label className={label}>
          Perfumers <span className="font-normal text-muted">(optional)</span>
          <input {...bind("perfumers")} autoComplete="off" placeholder="Cécile Matton, Serge Majoullier" className={textField} />
          {errors.perfumers && <span className={errorText}>{errors.perfumers}</span>}
          <MatchChips text={draft.perfumers} catalog={catalogs.perfumers} onUse={replaceIn("perfumers")} />
        </label>
      </section>

      <section className="grid gap-5">
        <h2 className={rowHeading}>Notes</h2>
        <div>
          <label className={label} htmlFor="pyramid-sentence">
            Paste the notes sentence <span className="font-normal text-muted">(optional shortcut)</span>
          </label>
          <textarea
            id="pyramid-sentence"
            value={sentence}
            onChange={(e) => setSentence(e.target.value)}
            rows={3}
            placeholder="Top notes are Pink Pepper, Cardamom and Violet Leaf; middle notes are Toffee and Cinnamon; base notes are Vanilla and Amber."
            className={textField}
          />
          <button type="button" onClick={fillFromSentence} className={`${secondaryButton} mt-2`}>
            Fill in the notes
          </button>
          {sentenceError && <p className={errorText}>{sentenceError}</p>}
        </div>
        {errors.notes && <p className="text-sm text-danger">{errors.notes}</p>}
        {(["top", "heart", "base"] as const).map((layer) => (
          <label key={layer} className={label}>
            {layer === "top" ? "Top notes" : layer === "heart" ? "Heart notes" : "Base notes"}
            <textarea {...bind(layer)} rows={2} placeholder="Comma-separated" className={textField} />
            {errors[layer] && <span className={errorText}>{errors[layer]}</span>}
            <MatchChips text={draft[layer]} catalog={catalogs.notes} onUse={replaceIn(layer)} />
          </label>
        ))}
      </section>

      <section className="grid gap-5">
        <h2 className={rowHeading}>Accords</h2>
        <label className={label}>
          Accords, strongest first
          <textarea {...bind("accords")} rows={3} placeholder="Sweet 100, Warm Spicy 85, Vanilla 70" className={textField} />
          <span className={errors.accords ? errorText : hint}>
            {errors.accords ?? "Add a strength (1–100) after each, or list them in order and they'll get 100, 90, 80…"}
          </span>
        </label>
        {accordMatches.length > 0 && (
          <ul className="grid gap-2">
            {accordMatches.map((m) => {
              const key = nameKey(m.name);
              const color = m.kind === "existing" ? accordColors.get(m.name) : (colors[key] ?? "#9ca3af");
              return (
                <li key={key} className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="h-2 w-28 overflow-hidden rounded-full bg-raised" aria-hidden="true">
                    <span className="block h-full rounded-full" style={{ width: `${m.strength}%`, background: color }} />
                  </span>
                  <span className="w-8 text-right text-muted tabular-nums">{m.strength}</span>
                  <MatchBadge match={m} onUse={replaceIn("accords")} />
                  {m.kind === "new" && (
                    <label className="flex items-center gap-2 text-muted">
                      colour
                      <input
                        type="color"
                        name={`color:${key}`}
                        value={colors[key] ?? "#9ca3af"}
                        onChange={(e) => setColors((c) => ({ ...c, [key]: e.target.value }))}
                        className="h-7 w-10 cursor-pointer rounded border border-line bg-transparent"
                      />
                    </label>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="grid gap-5">
        <h2 className={rowHeading}>Details</h2>
        <label className={label}>
          Bottle photo link <span className="font-normal text-muted">(optional)</span>
          <input {...bind("imageUrl")} type="url" autoComplete="off" placeholder="https://…" className={textField} />
          {errors.imageUrl && <span className={errorText}>{errors.imageUrl}</span>}
        </label>
        {draft.imageUrl.startsWith("https://") && (
          // eslint-disable-next-line @next/next/no-img-element -- a preview of any pasted link
          <img src={draft.imageUrl} alt="Bottle preview" className="h-40 w-auto self-start rounded-md bg-surface object-contain" />
        )}
        <label className={label}>
          Description <span className="font-normal text-muted">(optional, one or two sentences, in your own words)</span>
          <textarea {...bind("description")} rows={3} className={textField} />
          {errors.description && <span className={errorText}>{errors.description}</span>}
        </label>
      </section>

      <section className="grid gap-4 rounded-lg bg-surface p-5">
        <h2 className="font-bold">Saving will add</h2>
        <ul className="grid gap-1 text-sm text-muted">
          <li>
            1 fragrance{draft.name.trim() && <>: <span className="text-foreground">{draft.name.trim()}</span></>}
          </li>
          {created.brand && <li>A new house: <span className="text-foreground">{created.brand}</span></li>}
          {created.perfumers.length > 0 && <li>New perfumers: <span className="text-foreground">{created.perfumers.join(", ")}</span></li>}
          {created.notes.length > 0 && <li>New notes: <span className="text-foreground">{created.notes.join(", ")}</span></li>}
          {created.accords.length > 0 && <li>New accords: <span className="text-foreground">{created.accords.join(", ")}</span></li>}
          {!created.brand && created.perfumers.length + created.notes.length + created.accords.length === 0 && (
            <li>Everything else matches what&rsquo;s already in the catalog.</li>
          )}
        </ul>
        {state.message && (
          <p role="alert" className="text-sm text-danger">
            {state.message}
          </p>
        )}
        {Object.keys(errors).length > 0 && (
          <p role="alert" className="text-sm text-danger">
            Some fields need a look; they&rsquo;re marked above.
          </p>
        )}
        <button type="submit" disabled={pending} className={`${primaryButton} justify-self-start`}>
          {pending ? "Adding…" : "Add to the catalog"}
        </button>
      </section>
    </form>
  );
}

type Match = ReturnType<typeof matchName>;

function MatchBadge({ match, onUse }: { match: Match; onUse: (from: string, to: string) => void }) {
  if (match.kind === "existing") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-raised px-2.5 py-1 text-xs font-bold text-foreground">
        <span aria-hidden="true">✓</span> {match.name}
        <span className="sr-only">(already in the catalog)</span>
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="rounded-full border border-gold px-2.5 py-1 text-xs font-bold text-gold">New: {match.name}</span>
      {match.suggestion && (
        <button
          type="button"
          onClick={() => onUse(match.input, match.suggestion!)}
          className="text-xs font-bold text-muted underline underline-offset-2 hover:text-foreground"
        >
          Did you mean {match.suggestion}?
        </button>
      )}
    </span>
  );
}

function MatchChips({
  text,
  catalog,
  onUse,
}: {
  text: string;
  catalog: Catalog;
  onUse: (from: string, to: string) => void;
}) {
  const items = splitList(text);
  if (items.length === 0) return null;
  return (
    <span className="mt-2 flex flex-wrap gap-2 font-normal">
      {items.map((item) => (
        <MatchBadge key={item} match={matchName(item, catalog)} onUse={onUse} />
      ))}
    </span>
  );
}

function MatchLine({ match, onUse, what }: { match: Match; onUse: (to: string) => void; what: string }) {
  if (match.kind === "existing") {
    return <span className={hint}>✓ Matches {match.name}, already in the catalog.</span>;
  }
  return (
    <span className={hint}>
      A new {what}: <span className="text-gold">{match.name}</span>.
      {match.suggestion && (
        <>
          {" "}
          <button type="button" onClick={() => onUse(match.suggestion!)} className="font-bold underline underline-offset-2">
            Did you mean {match.suggestion}?
          </button>
        </>
      )}
    </span>
  );
}
