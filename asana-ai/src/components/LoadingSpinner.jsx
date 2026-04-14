/**
 * components/LoadingSpinner.jsx — grey/white theme
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
          'rounded-full border-brand-soft border-t-brand animate-spin',
        ].join(' ')}
        role="status"
        aria-label={label}
      />
      {label && (
        <p className="text-[0.78rem] text-ink-faint tracking-wide font-medium">
          {label}
        </p>
      )}
    </div>
  )
}
