"use client";

import { useEffect, useId, useRef, useState } from "react";
import { type Place, placeLabel } from "@/lib/places";
import { textField } from "@/lib/ui";

// Pick a city from the weather service's own list, so it's always one it has
// weather for. Typing searches; only a city chosen from the list counts.
export function CityPicker({
  value,
  onChange,
  label,
  hint,
  initialText = "",
  autoFocus = false,
}: {
  value: Place | null;
  onChange: (place: Place | null) => void;
  label: string;
  hint?: string;
  initialText?: string;
  autoFocus?: boolean;
}) {
  const id = useId();
  const [text, setText] = useState(value ? placeLabel(value) : initialText);
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [status, setStatus] = useState<"idle" | "searching" | "none" | "error">("idle");
  const [touched, setTouched] = useState(false);
  const request = useRef(0);

  // Search as you type, a moment after the last key.
  useEffect(() => {
    const q = text.trim();
    if (value || q.length < 2) return;
    const mine = ++request.current;
    const timer = setTimeout(async () => {
      setStatus("searching");
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (mine !== request.current) return; // a newer search has started
        if (!res.ok) throw new Error(data.error);
        setResults(data.places);
        setActive(data.places.length ? 0 : -1);
        setStatus(data.places.length ? "idle" : "none");
        setOpen(true);
      } catch {
        if (mine === request.current) setStatus("error");
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [text, value]);

  function choose(place: Place) {
    onChange(place);
    setText(placeLabel(place));
    setOpen(false);
    setResults([]);
    setStatus("idle");
  }

  function type(next: string) {
    setText(next);
    setTouched(true);
    if (value) onChange(null); // editing the text un-chooses the city
    if (next.trim().length < 2) {
      setOpen(false);
      setResults([]);
      setStatus("idle");
    }
  }

  function keyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && results.length) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === "ArrowUp" && results.length) {
      e.preventDefault();
      setActive((a) => (a <= 0 ? results.length - 1 : a - 1));
    } else if (e.key === "Enter" && open && active >= 0) {
      e.preventDefault(); // choose, don't submit the form
      choose(results[active]);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
    }
  }

  const listId = `${id}-list`;
  const unchosen = touched && !value && text.trim().length > 0 && !open;
  const message =
    status === "searching"
      ? "Searching…"
      : status === "none"
        ? `No city called “${text.trim()}”. Check the spelling, or try a nearby city.`
        : status === "error"
          ? "City search isn't answering right now. Try again in a moment."
          : unchosen
            ? "Choose a city from the list."
            : hint;

  return (
    <div className="relative">
      <label htmlFor={`${id}-input`} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={`${id}-input`}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? `${id}-opt-${active}` : undefined}
        aria-describedby={`${id}-msg`}
        aria-invalid={unchosen || undefined}
        autoComplete="off"
        spellCheck={false}
        autoFocus={autoFocus}
        value={text}
        placeholder="Start typing a city"
        onChange={(e) => type(e.target.value)}
        onKeyDown={keyDown}
        onFocus={() => results.length && !value && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className={textField}
      />
      {open && results.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-line-strong bg-raised py-1 shadow-xl"
        >
          {results.map((place, i) => (
            <li
              key={place.id}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()} // keep focus in the input
              onClick={() => choose(place)}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-2 text-sm ${i === active ? "bg-surface text-foreground" : "text-muted"}`}
            >
              <span className="font-bold text-foreground">{place.name}</span>
              {place.region && place.region !== place.name && <span>, {place.region}</span>}
              {place.country && <span>, {place.country}</span>}
            </li>
          ))}
        </ul>
      )}
      <span
        id={`${id}-msg`}
        role={status === "searching" ? "status" : undefined}
        className={`mt-1.5 block text-sm ${unchosen || status === "error" || status === "none" ? "text-danger" : "text-muted"}`}
      >
        {message}
      </span>
    </div>
  );
}
