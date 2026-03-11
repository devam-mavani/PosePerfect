/**
 * components/WebcamFeed.jsx
 *
 * Bear-inspired webcam feed panel.
 * Warm paper card, clean controls, rust accent.
 */

export default function WebcamFeed({ videoRef, isStreaming, isCapturing, onStart, onStop }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-warm bg-paper-card shadow-card flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-warm bg-paper">
        <div className="flex items-center gap-2.5">
          <span className="text-[0.9rem]">📷</span>
          <span className="font-display font-semibold text-[0.92rem] text-ink tracking-tight">
            Live Feed
          </span>
        </div>
        {isStreaming && (
          <span className="flex items-center gap-1.5 text-[0.7rem] font-semibold tracking-[0.1em] uppercase text-status-bad">
            <span className="w-1.5 h-1.5 rounded-full bg-status-bad rec-dot" />
            Live
          </span>
        )}
      </div>

      {/* Video / Placeholder */}
      <div className="relative bg-paper-mid min-h-[360px] flex items-center justify-center flex-1">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={[
            'w-full block',
            isStreaming ? 'opacity-100' : 'opacity-0 absolute',
          ].join(' ')}
        />

        {!isStreaming && (
          <div className="flex flex-col items-center gap-3 text-ink-faint px-8 py-12 select-none">
            <span className="text-5xl opacity-40">🧘</span>
            <p className="font-display text-[0.95rem] font-medium text-ink-muted">
              Camera is off
            </p>
            <p className="text-[0.8rem] text-center leading-relaxed max-w-[220px]">
              Click <strong className="text-bear font-semibold">Start Camera</strong> to begin real-time pose detection
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-3 px-5 py-4 border-t border-warm bg-paper">
        {!isStreaming ? (
          <button
            onClick={onStart}
            className="flex-1 py-2.5 rounded-lg bg-bear text-white text-[0.875rem] font-semibold
                       tracking-wide shadow-bear transition-all duration-200
                       hover:bg-bear-dark hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]"
          >
            Start Camera
          </button>
        ) : (
          <button
            onClick={onStop}
            className="flex-1 py-2.5 rounded-lg border border-status-bad/40 text-status-bad bg-red-50
                       text-[0.875rem] font-medium tracking-wide transition-all duration-200
                       hover:bg-red-100 active:scale-[0.98]"
          >
            ■ Stop
          </button>
        )}

        <div
          className={[
            'flex-1 py-2.5 rounded-lg border text-[0.82rem] font-medium tracking-wide text-center select-none',
            isCapturing
              ? 'border-bear/30 text-bear bg-bear-pale'
              : 'border-warm text-ink-faint bg-paper-mid',
          ].join(' ')}
        >
          {isCapturing ? '⚡ Detecting…' : '🎯 Auto-detect'}
        </div>
      </div>
    </div>
  )
}
