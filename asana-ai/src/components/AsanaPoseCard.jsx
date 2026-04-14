/**
 * components/AsanaPoseCard.jsx  (v2)
 *
 * Added: onSkipAsana prop — shows "Skip Asana" button in addition to "I'm Ready"
 */

export default function AsanaPoseCard({ asana, countdown, onSkip, onSkipAsana }) {
  if (!asana) return null

  const PREVIEW_SECS = 5
  const imgSrc = `/asana-images/${asana.slug}.svg`

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center
                    bg-ink/60 backdrop-blur-sm p-4 animate-fade-up">
      <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-lift">

        {/* Image */}
        <div className="relative bg-lavender-pale h-72 flex items-center justify-center overflow-hidden">
          <img
            src={imgSrc}
            alt={asana.name}
            className="w-full h-full object-contain p-4"
            onError={e => {
              if (!e.target.src.endsWith('.jpg')) {
                e.target.src = `/asana-images/${asana.slug}.jpg`
              } else {
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'flex'
              }
            }}
          />
          <div className="hidden absolute inset-0 flex-col items-center justify-center bg-lavender-pale">
            <span className="text-[5rem] opacity-40">🧘</span>
            <p className="text-lavender text-[0.8rem] font-semibold mt-2">Image not available</p>
          </div>

          {/* Countdown ring */}
          <div className="absolute top-4 right-4 w-14 h-14">
            <svg className="-rotate-90" width="56" height="56">
              <circle cx="28" cy="28" r="22" fill="rgba(240,238,255,0.7)"
                stroke="rgba(124,111,205,0.25)" strokeWidth="4" />
              <circle cx="28" cy="28" r="22" fill="none"
                stroke="#7C6FCD" strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 22}`}
                strokeDashoffset={`${2 * Math.PI * 22 * (1 - countdown / PREVIEW_SECS)}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.9s linear' }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center
                             font-display font-bold text-lavender text-[1rem]">
              {countdown}
            </span>
          </div>

          {/* Badge */}
          <div className="absolute top-4 left-4 bg-lavender text-white text-[0.65rem]
                          font-bold tracking-[0.1em] uppercase px-3 py-1.5 rounded-full shadow-lavender">
            Next Asana
          </div>
        </div>

        {/* Info */}
        <div className="px-7 py-6">
          <h2 className="font-display text-[1.9rem] font-extrabold text-ink mb-1 leading-tight">
            {asana.name}
          </h2>
          {asana.totalSteps && (
            <p className="text-ink-muted text-[0.85rem] mb-4">
              {asana.totalSteps} step{asana.totalSteps !== 1 ? 's' : ''} to complete
            </p>
          )}

          {/* Starting in counter */}
          <div className="bg-lavender-pale border border-lavender-soft rounded-xl
                          px-4 py-2.5 text-center mb-3">
            <p className="text-lavender font-display font-bold text-[1.3rem]">{countdown}s</p>
            <p className="text-[0.68rem] text-lavender/70 uppercase tracking-wide font-semibold">
              Auto-starting
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onSkip}
              className="flex-1 py-3 rounded-xl bg-lavender text-white font-bold text-[0.9rem]
                         shadow-lavender hover:bg-lavender-dark transition-all duration-200
                         hover:-translate-y-0.5 active:translate-y-0">
              I'm Ready →
            </button>
            {onSkipAsana && (
              <button
                onClick={onSkipAsana}
                className="px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-700
                           font-semibold text-[0.85rem] hover:bg-amber-100 transition-all duration-200
                           whitespace-nowrap">
                ⏭ Skip
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
