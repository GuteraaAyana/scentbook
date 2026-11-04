// A set of radio buttons drawn as chips. Real radios, so arrow keys and screen
// readers work as usual. Picking nothing is allowed.
export function ChipChoice({
  name,
  label,
  options,
  defaultValue,
  describedBy,
}: {
  name: string;
  label: string;
  // `value` is what's submitted; `label` is what's shown (defaults to value).
  options: { value: string; label?: string }[];
  defaultValue?: string;
  describedBy?: string;
}) {
  return (
    <fieldset aria-describedby={describedBy}>
      <legend className="text-sm font-bold">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {options.map((option) => (
          <label key={option.value} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={option.value === defaultValue}
              className="peer sr-only"
            />
            <span className="inline-block rounded-md bg-raised px-3 py-1.5 text-sm font-semibold transition-colors peer-checked:bg-gold peer-checked:text-gold-ink peer-focus-visible:outline-2 peer-focus-visible:outline-gold">
              {option.label ?? option.value}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
