// Shared class names for the few repeated controls, so every button and field
// looks and behaves the same.

// Brass: the one main action on a screen.
export const primaryButton =
  "inline-flex h-11 items-center justify-center rounded-full bg-brass px-5 font-medium text-brass-ink transition-opacity hover:opacity-90 disabled:opacity-60";

// Outlined: secondary actions.
export const secondaryButton =
  "inline-flex h-11 items-center justify-center rounded-full border border-line-strong px-5 font-medium text-foreground transition-colors hover:border-foreground hover:bg-raised disabled:opacity-60";

export const textField =
  "mt-1.5 block w-full rounded-md border border-line-strong bg-raised px-3 py-2.5 text-foreground placeholder:text-muted";

// Page width and gutters.
export const pageContainer = "mx-auto w-full max-w-6xl px-4 sm:px-6";
