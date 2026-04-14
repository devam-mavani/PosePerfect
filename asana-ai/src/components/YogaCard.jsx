/**
 * components/YogaCard.jsx
 *
 * A beautiful shareable "Yoga Card" modal shown at the end of each session.
 * Displays: poses done, accuracy per pose, total time, streak.
 * Can be downloaded as a PNG image for social sharing.
 *
 * Props:
 *  summary   – session summary object from useSessionStats
 *  streak    – current streak number
 *  onClose() – dismiss the card
 */

import { useRef, useCallback } from 'react'

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

function AccuracyBar({ pose, accuracy }) {
  const color = accuracy >= 90 ? '#10B981' : accuracy >= 70 ? '#7C6FCD' : '#F59E0B'
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="text-[0.78rem] font-medium text-ink">{pose}</span>
        <span className="text-[0.78rem] font-bold" style={{ color }}>{accuracy}%</span>
      </div>
      <div className="h-1.5 bg-surface-mid rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${accuracy}%`, background: color }}
        />
      </div>
    </div>
  )
}

export default function YogaCard({ summary, streak, onClose }) {
  const cardRef = useRef(null)

  const handleDownload = useCallback(async () => {
    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(cardRef.current, {
      backgroundColor: '#FAFAFE',
      scale: 2,
      useCORS: true,
    })
    const link     = document.createElement('a')
    link.download  = `poseperfect-session-${new Date().toISOString().slice(0, 10)}.png`
    link.href      = canvas.toDataURL('image/png')
    link.click()
  }, [])

  if (!summary) return null

  const { poses, poseAccuracy, avgAccuracy, durationSec } = summary

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── The card (this gets captured for download) ── */}
        <div
          ref={cardRef}
          className="bg-white rounded-3xl overflow-hidden border border-edge shadow-lift"
        >
          {/* Header gradient */}
          <div className="bg-gradient-to-br from-lavender to-lavender-dark px-7 py-6">
            <div className="flex items-center gap-3 mb-4">
              <img src="/logo.png" alt="logo" className="w-8 h-8 rounded-xl object-cover"
                onError={(e) => { e.target.style.display = 'none' }} />
              <span className="font-display font-bold text-white text-[1rem]">PosePerfect</span>
            </div>
            <p className="text-white/70 text-[0.72rem] font-semibold tracking-[0.1em] uppercase mb-1">
              Session Complete
            </p>
            <p className="font-display font-extrabold text-white text-[2rem] leading-tight">
              {avgAccuracy}%
            </p>
            <p className="text-white/80 text-[0.82rem]">average accuracy</p>

            {/* Stats row */}
            <div className="flex gap-4 mt-5">
              <div className="bg-white/15 rounded-xl px-3 py-2 flex-1 text-center">
                <p className="font-display font-bold text-white text-[1.2rem]">{poses.length}</p>
                <p className="text-white/70 text-[0.65rem] uppercase tracking-wide">Poses</p>
              </div>
              <div className="bg-white/15 rounded-xl px-3 py-2 flex-1 text-center">
                <p className="font-display font-bold text-white text-[1.2rem]">
                  {formatDuration(durationSec)}
                </p>
                <p className="text-white/70 text-[0.65rem] uppercase tracking-wide">Duration</p>
              </div>
              <div className="bg-white/15 rounded-xl px-3 py-2 flex-1 text-center">
                <p className="font-display font-bold text-white text-[1.2rem]">
                  {streak ?? '—'}🔥
                </p>
                <p className="text-white/70 text-[0.65rem] uppercase tracking-wide">Streak</p>
              </div>
            </div>
          </div>

          {/* Pose accuracy breakdown */}
          <div className="px-7 py-5">
            <p className="text-[0.68rem] font-semibold tracking-[0.12em] uppercase text-ink-faint mb-4">
              Pose Accuracy
            </p>
            <div className="flex flex-col gap-3">
              {poses.map((pose) => (
                <AccuracyBar key={pose} pose={pose} accuracy={poseAccuracy[pose] ?? 0} />
              ))}
            </div>

            {/* Date watermark */}
            <p className="text-[0.68rem] text-ink-faint mt-5 text-center">
              {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              {' · '}pose-perfect-delta.vercel.app
            </p>
          </div>
        </div>

        {/* Action buttons — outside the capture area */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleDownload}
            className="flex-1 py-3 rounded-2xl bg-lavender text-white font-bold text-[0.875rem]
                       shadow-lavender hover:bg-lavender-dark transition-all duration-200
                       hover:-translate-y-0.5 active:scale-[0.98]"
          >
            📥 Download Card
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-white border border-edge text-ink-muted
                       font-semibold text-[0.875rem] hover:bg-surface transition-all duration-200
                       active:scale-[0.98]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
