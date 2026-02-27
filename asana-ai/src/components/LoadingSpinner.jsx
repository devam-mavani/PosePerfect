/**
 * components/LoadingSpinner.jsx
 *
 * Reusable inline loading spinner with an optional label.
 *
 * Props:
 *  label  – string (optional, default "Loading…")
 *  size   – "sm" | "md" | "lg" (default "md")
 */

const SIZE_MAP = {
  sm: 'w-5 h-5 border-2',
  md: 'w-9 h-9 border-[3px]',
  lg: 'w-14 h-14 border-4',
}

export default function LoadingSpinner({ label = 'Loading…', size = 'md' }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <span
        className={[
          SIZE_MAP[size],
          'rounded-full border-sage/15 border-t-sage animate-spin',
        ].join(' ')}
        role="status"
        aria-label={label}
      />
      {label && (
        <p className="text-[0.78rem] text-muted tracking-wide">{label}</p>
      )}
    </div>
  )
}
