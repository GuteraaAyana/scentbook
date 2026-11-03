"use client";

import { useRef, useState, useTransition } from "react";
import { loadBucket, removeRanking, saveRanking } from "@/lib/actions/ranking";
import { comparison, placeAfterAnswer, startPlacement, type Placement, type Sentiment } from "@/lib/ranking";
import { primaryButton, secondaryButton } from "@/lib/ui";
import { ScentCase } from "./scent-case";

type Fragrance = {
  id: number;
  name: string;
  brand: string;
  imageUrl: string | null;
  accords: { name: string; color: string; strength: number }[];
};

export type CurrentRanking = { sentiment: Sentiment; position: number; bucketSize: number; score: number } | null;

const feelings: { sentiment: Sentiment; label: string }[] = [
  { sentiment: "loved", label: "I loved it" },
  { sentiment: "fine", label: "It was fine" },
  { sentiment: "disliked", label: "I didn't like it" },
];

type Step =
  | { kind: "feeling" }
  | { kind: "comparing"; sentiment: Sentiment; bucket: Fragrance[]; placement: Placement; asked: number }
  | { kind: "done"; score: number };

// "Rank it" on a fragrance page: say how you felt, then answer a few "which do
// you prefer?" questions against fragrances you've already ranked in that
// bucket. The search runs here in the browser; only the final spot is sent.
export function RankFlow({ fragrance, current }: { fragrance: Fragrance; current: CurrentRanking }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<Step>({ kind: "feeling" });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function open() {
    setStep({ kind: "feeling" });
    setError(null);
    dialog.current?.showModal();
  }

  function save(sentiment: Sentiment, bucket: Fragrance[], index: number) {
    startTransition(async () => {
      const result = await saveRanking({
        fragranceId: fragrance.id,
        sentiment,
        aboveId: bucket[index - 1]?.id ?? null,
        belowId: bucket[index]?.id ?? null,
      });
      if (result.error || !result.ranking) setError(result.error ?? "Couldn't save that ranking.");
      else setStep({ kind: "done", score: result.ranking.score });
    });
  }

  function chooseFeeling(sentiment: Sentiment) {
    setError(null);
    startTransition(async () => {
      const result = await loadBucket(fragrance.id, sentiment);
      if (result.error) return setError(result.error);
      const placement = startPlacement(result.bucket.length);
      // Nothing to compare against yet: it simply goes in.
      if (comparison(placement) === null) return save(sentiment, result.bucket, 0);
      setStep({ kind: "comparing", sentiment, bucket: result.bucket, placement, asked: 0 });
    });
  }

  function answer(choice: "better" | "worse" | "same") {
    if (step.kind !== "comparing") return;
    const placement = placeAfterAnswer(step.placement, choice);
    if (comparison(placement) === null) return save(step.sentiment, step.bucket, placement.lo);
    setStep({ ...step, placement, asked: step.asked + 1 });
  }

  function remove() {
    startTransition(async () => {
      const result = await removeRanking(fragrance.id);
      if (result.error) setError(result.error);
    });
  }

  const pivot = step.kind === "comparing" ? step.bucket[comparison(step.placement)!] : null;
  const questionsLeft =
    step.kind === "comparing" ? Math.ceil(Math.log2(step.placement.hi - step.placement.lo + 1)) : 0;

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={open} className={primaryButton}>
          {current ? "Rank it again" : "Rank it"}
        </button>
        {current && (
          <button type="button" onClick={remove} disabled={pending} className={secondaryButton}>
            Remove my ranking
          </button>
        )}
      </div>

      <dialog
        ref={dialog}
        aria-labelledby="rank-title"
        className="m-auto w-[min(40rem,calc(100vw-2rem))] rounded-lg border border-line bg-background p-6 text-foreground backdrop:bg-black/70 sm:p-8"
      >
        {step.kind === "feeling" && (
          <>
            <h2 id="rank-title" className="font-display text-3xl">
              How did you feel about {fragrance.name}?
            </h2>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {feelings.map((f) => (
                <button
                  key={f.sentiment}
                  type="button"
                  disabled={pending}
                  onClick={() => chooseFeeling(f.sentiment)}
                  className={secondaryButton}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </>
        )}

        {step.kind === "comparing" && pivot && (
          <>
            <h2 id="rank-title" className="font-display text-3xl">
              Which do you prefer?
            </h2>
            <p className="mt-1 text-sm text-muted">
              {questionsLeft === 1 ? "Last question." : `About ${questionsLeft} more questions.`}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-4">
              {[
                { item: fragrance, choice: "better" as const },
                { item: pivot, choice: "worse" as const },
              ].map(({ item, choice }) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={pending}
                  onClick={() => answer(choice)}
                  className="group rounded-md text-left"
                >
                  <ScentCase
                    name={item.name}
                    imageUrl={item.imageUrl}
                    accords={item.accords}
                    sizes="(min-width: 640px) 18rem, 45vw"
                    className="aspect-square transition-shadow group-hover:ring-brass"
                  />
                  <span className="font-display mt-3 block text-lg leading-snug">{item.name}</span>
                  <span className="block text-sm text-muted">{item.brand}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() => answer("same")}
              className="mt-6 text-sm text-muted underline underline-offset-4 hover:text-foreground"
            >
              I can&rsquo;t choose
            </button>
          </>
        )}

        {step.kind === "done" && (
          <>
            <h2 id="rank-title" className="font-display text-3xl">
              Ranked
            </h2>
            <p className="mt-2 text-muted">
              {fragrance.name} scores <span className="font-display text-2xl text-foreground">{step.score}</span>{" "}
              out of 10 for you.
            </p>
            <button type="button" onClick={() => dialog.current?.close()} className={`${primaryButton} mt-8`}>
              Done
            </button>
          </>
        )}

        <p role="status" aria-live="polite" className="mt-4 min-h-5 text-sm">
          {error ? <span className="text-danger">{error}</span> : pending ? <span className="text-muted">Saving…</span> : null}
        </p>

        {step.kind !== "done" && (
          <form method="dialog" className="mt-2">
            <button className="text-sm text-muted hover:text-foreground">Cancel</button>
          </form>
        )}
      </dialog>
    </>
  );
}
