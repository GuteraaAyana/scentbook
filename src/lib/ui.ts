// Shared class names for the few repeated controls, so every button and field
// looks and behaves the same.

// Gold: the one main action on a screen.
export const primaryButton =
  "inline-flex h-10 items-center justify-center rounded-md bg-gold px-4 text-sm font-bold text-gold-ink transition-opacity hover:opacity-90 disabled:opacity-60";

// Panel-coloured: everything else you can press.
export const secondaryButton =
  "inline-flex h-10 items-center justify-center rounded-md bg-surface px-4 text-sm font-bold text-foreground transition-colors hover:bg-raised disabled:opacity-60";

export const textField =
  "mt-1.5 block w-full rounded-md border border-line-strong bg-raised px-3 py-2.5 text-foreground placeholder:text-muted";

// A row heading: bold title on the left, optional link on the right, a rule under.
export const rowHeading = "flex items-baseline justify-between gap-4 border-b border-line pb-2 text-sm font-bold text-muted";

// Page width and gutters.
export const pageContainer = "mx-auto w-full max-w-6xl px-4 sm:px-6";
