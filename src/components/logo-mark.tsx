// Scentbook's mark: a perfume bottle with a diary's ribbon bookmark (the same
// drawing as the tab icon, src/app/icon.svg). Decorative next to the wordmark.
export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <rect width="64" height="64" rx="14" fill="var(--color-surface)" />
      <rect x="25" y="8" width="14" height="7" rx="2" fill="var(--color-gold)" />
      <rect x="28.5" y="15" width="7" height="5" fill="var(--color-gold)" />
      <rect x="15.5" y="20.5" width="33" height="35" rx="7" fill="none" stroke="var(--color-gold)" strokeWidth="4" />
      <path d="M36 20.5h8v24l-4-4-4 4z" fill="var(--color-gold)" />
    </svg>
  );
}
