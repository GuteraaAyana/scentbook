"use client";

import { useState } from "react";
import { textField } from "@/lib/ui";

// A textarea with a live "n of max" count underneath, or the error in its
// place. It keeps its own count, so when a form is rebuilt (keyed) it starts
// from its new default.
export function CountedTextarea({
  name,
  max,
  defaultValue = "",
  error,
  placeholder,
  rows = 3,
  id,
}: {
  name: string;
  max: number;
  defaultValue?: string;
  error?: string;
  placeholder?: string;
  rows?: number;
  id: string;
}) {
  const [length, setLength] = useState(defaultValue.length);
  return (
    <>
      <textarea
        name={name}
        rows={rows}
        maxLength={max}
        defaultValue={defaultValue}
        onChange={(e) => setLength(e.target.value.length)}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={`${id}-help`}
        className={`${textField} resize-y`}
      />
      <span id={`${id}-help`} className={error ? "mt-1.5 block text-sm text-danger" : "mt-1.5 block text-sm text-muted"}>
        {error ?? `${length} of ${max}`}
      </span>
    </>
  );
}
