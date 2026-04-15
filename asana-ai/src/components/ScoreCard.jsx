/**
 * components/ScoreCard.jsx
 *
 * Enhanced session scorecard replacing YogaCard.
 * Shows: completed asanas with accuracy, skipped asanas, session status,
 * streak, duration. Sends notification via backend on render.
 *
 * Props:
 *  summary        — from useSessionStats.endSession()
 *  streak         — current streak number
 *  skippedSlugs   — Set of skipped slugs from useScheduleSession
 *  dayName        — e.g. "Monday"
 *  allAsanas      — full list of slugs in today's session
 *  status         — "completed" | "ended"
 *  onClose()      — dismiss
 */

import { useRef, useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getAsanaDisplayName } from '../utils/scheduleGenerator'
import { notifySession } from '../services/api'

function formatDuration(seconds) {
  if (!seconds) return '0m'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

// ── Accuracy bar row ──────────────────────────────────────────────────────────
function AsanaRow({ slug, status, accuracy }) {
  const displayName = getAsanaDisplayName(slug)

  if (status === 'skipped') {
    return (
      <div className="flex items-center gap-3 py-2.5 border-b border-edge/50 last:border-0">
        <div className="w-7 h-7 rounded-lg bg-surface-mid flex items-center justify-center text-[0.85rem]">
          ⏭
        </div>
        <span className="flex-1 text-[0.85rem] font-medium text-ink-faint">{displayName}</span>
        <span className="text-[0.75rem] text-ink-faint bg-surface-mid px-2 py-0.5 rounded-full">
          Skipped
        </span>
      </div>
    )
  }

  const color = accuracy >= 90 ? '#10B981' : accuracy >= 70 ? '#7C6FCD' : '#F59E0B'
  const bgClass = accuracy >= 90 ? 'bg-green-50' : accuracy >= 70 ? 'bg-lavender-pale' : 'bg-amber-50'
  const label   = accuracy >= 90 ? '🏆' : accuracy >= 70 ? '✓' : '↑'

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-edge/50 last:border-0">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[0.85rem] ${bgClass}`}>
        {label}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between mb-1">
          <span className="text-[0.85rem] font-medium text-ink truncate">{displayName}</span>
          <span className="text-[0.82rem] font-bold ml-3 shrink-0" style={{ color }}>
            {accuracy}%
          </span>
        </div>
        <div className="h-1.5 bg-surface-mid rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
               style={{ width: `${accuracy}%`, background: color }} />
        </div>
      </div>
    </div>
  )
}

// ── Duolingo-style motivation message ─────────────────────────────────────────
function MotivationBanner({ skippedCount, avgAccuracy, status }) {
  if (status === 'ended' && skippedCount === 0) {
    return (
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
        <span className="text-[1.4rem] shrink-0">⏸</span>
        <div>
          <p className="text-[0.85rem] font-bold text-amber-800">Session Paused</p>
          <p className="text-[0.78rem] text-amber-700 mt-0.5">
            Great start! You can't resume this tomorrow — try to finish today.
          </p>
        </div>
      </div>
    )
  }
  if (skippedCount > 0) {
    return (
      <div className="flex items-start gap-3 bg-lavender-pale border border-lavender-soft rounded-xl px-4 py-3 mb-4">
        <span className="text-[1.4rem] shrink-0">🌱</span>
        <div>
          <p className="text-[0.85rem] font-bold text-lavender">
            {skippedCount} asana{skippedCount > 1 ? 's' : ''} skipped
          </p>
          <p className="text-[0.78rem] text-lavender/80 mt-0.5">
            Progress &gt; perfection. Try them tomorrow — your streak is still intact!
          </p>
        </div>
      </div>
    )
  }
  if (avgAccuracy >= 90) {
    return (
      <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
        <span className="text-[1.4rem] shrink-0">🏆</span>
        <div>
          <p className="text-[0.85rem] font-bold text-status-ok">Outstanding session!</p>
          <p className="text-[0.78rem] text-green-700 mt-0.5">
            {avgAccuracy}% accuracy — you're mastering these poses beautifully.
          </p>
        </div>
      </div>
    )
  }
  return null
}

export default function ScoreCard({ summary, streak, skippedSlugs, dayName, allAsanas, status = 'completed', onClose }) {
  const cardRef = useRef(null)
  const { currentUser, userProfile } = useAuth()
  const [notifSent, setNotifSent] = useState(false)

  const skippedSet = skippedSlugs instanceof Set ? skippedSlugs : new Set(skippedSlugs || [])

  const { accuracies = {}, avgAccuracy = 0, durationSec = 0 } = summary || {}

  // Build display rows — in order of the original asana list
  const allRows = (allAsanas || []).map(slug =>
    skippedSet.has(slug)
      ? { slug, status: 'skipped', accuracy: 0 }
      : { slug, status: 'done', accuracy: accuracies[slug] ?? 0 }
  )

  const completedRows = allRows.filter(r => r.status === 'done')
  const skippedRows   = allRows.filter(r => r.status === 'skipped')

  // Send notification once on mount — after all hooks so the early return below is safe
  useEffect(() => {
    if (notifSent || !currentUser || !summary) return
    setNotifSent(true)

    const completedAsanas = completedRows.map(r => [r.slug, getAsanaDisplayName(r.slug)])
    const skippedAsanas   = skippedRows.map(r => [r.slug, getAsanaDisplayName(r.slug)])

    notifySession({
      userEmail:       userProfile?.email   || '',
      telegramChatId:  userProfile?.telegramChatId || null,
      userName:        userProfile?.firstName || 'Yogi',
      completedAsanas,
      skippedAsanas,
      accuracies,
      avgAccuracy,
      durationSec,
      streak:          streak || 0,
      dayName:         dayName || 'Today',
      status,
      date:            new Date().toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
      }),
    }).catch(err => console.warn('Notify failed (non-critical):', err))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Guard: must be AFTER all hooks
  if (!summary) return null

  const handleDownload = useCallback(async () => {
    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(cardRef.current, {
      backgroundColor: '#FAFAFE', scale: 2, useCORS: true,
    })
    const link    = document.createElement('a')
    link.download = `poseperfect-${new Date().toISOString().slice(0, 10)}.png`
    link.href     = canvas.toDataURL('image/png')
    link.click()
  }, [])

  const statusLabel = status === 'completed' ? 'Session Complete' : 'Session Ended Early'
  const headerBg    = status === 'completed'
    ? 'bg-gradient-to-br from-lavender to-lavender-dark'
    : 'bg-gradient-to-br from-[#6458B4] to-[#4A3F9A]'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
         onClick={onClose}>
      <div className="w-full max-w-sm animate-fade-up" onClick={e => e.stopPropagation()}>

        {/* ── Card (captured for download) ── */}
        <div ref={cardRef} className="bg-white rounded-3xl overflow-hidden border border-edge shadow-lift">

          {/* Header */}
          <div className={`${headerBg} px-6 py-5`}>
            <div className="flex items-center gap-2 mb-3">
              <img src="/logo.png" alt="logo" className="w-7 h-7 rounded-lg object-cover"
                   onError={e => { e.target.style.display = 'none' }} />
              <span className="font-display font-bold text-white text-[0.9rem]">PosePerfect</span>
              <span className="ml-auto text-[0.65rem] text-white/60">
                {dayName} · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
            </div>
            <p className="text-white/70 text-[0.65rem] font-bold tracking-[0.12em] uppercase mb-1">
              {statusLabel}
            </p>
            <p className="font-display font-extrabold text-white text-[2rem] leading-tight">
              {avgAccuracy}%
            </p>
            <p className="text-white/75 text-[0.8rem] mb-4">average accuracy</p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: `${completedRows.length}/${allAsanas.length}`, label: 'Done' },
                { val: formatDuration(durationSec),                   label: 'Duration' },
                { val: `${streak ?? 0}🔥`,                            label: 'Streak' },
              ].map(({ val, label }) => (
                <div key={label} className="bg-white/15 rounded-xl py-2 text-center">
                  <p className="font-display font-bold text-white text-[1.1rem] leading-none">{val}</p>
                  <p className="text-white/65 text-[0.6rem] uppercase tracking-wide mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Breakdown */}
          <div className="px-6 py-4">
            <MotivationBanner
              skippedCount={skippedSet.size}
              avgAccuracy={avgAccuracy}
              status={status}
            />

            <p className="text-[0.64rem] font-bold tracking-[0.12em] uppercase text-ink-faint mb-3">
              Pose Breakdown
            </p>
            <div>
              {allRows.map(({ slug, status: s, accuracy }) => (
                <AsanaRow key={slug} slug={slug} status={s} accuracy={accuracy} />
              ))}
            </div>

            <p className="text-[0.65rem] text-ink-faint mt-4 text-center">
              {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              {' · '}poseperfect.app
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-4">
          <button onClick={handleDownload}
            className="flex-1 py-3 rounded-2xl bg-lavender text-white font-bold text-[0.875rem]
                       shadow-lavender hover:bg-lavender-dark transition-all duration-200 hover:-translate-y-0.5">
            📥 Save Card
          </button>
          <button onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-white border border-edge text-ink-muted
                       font-semibold text-[0.875rem] hover:bg-surface transition-all duration-200">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
