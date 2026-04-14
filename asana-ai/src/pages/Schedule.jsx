/**
 * pages/Schedule.jsx  (v2)
 *
 * Changes:
 *  - DayCard shows "▶ Resume" instead of "▶ Start" if today's session was paused
 *  - Checks Firestore for an active saved session on load
 *  - "Skip Today" button sends a Duolingo-style reminder via backend
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../contexts/AuthContext'
import { getAsanaDisplayName } from '../utils/scheduleGenerator'
import { notifySkip } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'

const GOAL_LABELS = {
  fitness:     '💪 Fitness & Strength',
  relax:       '🧘 Relax & De-stress',
  weight_loss: '🔥 Weight Management',
  balance:     '⚖️ Balance & Posture',
  breathing:   '🌬️ Breathing & Wellness',
}
const LEVEL_LABELS = {
  beginner:     '🌱 Beginner',
  intermediate: '⭐ Intermediate',
  advanced:     '🔥 Advanced',
}

function formatSeconds(secs) {
  if (!secs) return '0m'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function DayCard({ day, isToday, onStart, hasResume, onSkipToday }) {
  const { dayName, isRest, asanas, totalSecs } = day
  const [skipping, setSkipping] = useState(false)

  async function handleSkipToday() {
    setSkipping(true)
    await onSkipToday?.()
    setSkipping(false)
  }

  return (
    <div className={[
      'bg-white border rounded-2xl overflow-hidden shadow-card transition-all duration-200',
      isToday ? 'border-lavender ring-2 ring-lavender/20' : 'border-edge',
      isRest ? 'opacity-60' : 'card-hover',
    ].join(' ')}>

      {/* Day header */}
      <div className={[
        'px-5 py-3.5 border-b border-edge flex items-center justify-between',
        isToday ? 'bg-lavender' : 'bg-surface',
      ].join(' ')}>
        <div>
          <p className={`font-display font-bold text-[0.95rem] ${isToday ? 'text-white' : 'text-ink'}`}>
            {dayName}
          </p>
          {isToday && (
            <p className="text-[0.65rem] text-white/80 font-semibold uppercase tracking-wide">Today</p>
          )}
        </div>
        {!isRest && (
          <span className={`text-[0.72rem] font-semibold ${isToday ? 'text-white/80' : 'text-ink-faint'}`}>
            ~{formatSeconds(totalSecs)}
          </span>
        )}
      </div>

      <div className="p-4">
        {isRest ? (
          <div className="text-center py-3">
            <p className="text-[1.5rem] mb-1">🌙</p>
            <p className="font-display font-semibold text-ink-muted text-[0.88rem]">Rest Day</p>
            <p className="text-ink-faint text-[0.72rem] mt-0.5">Recovery & relaxation</p>
          </div>
        ) : (
          <>
            {/* Asana chips */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {asanas.slice(0, 4).map(slug => (
                <span key={slug}
                  className="bg-lavender-pale border border-lavender-soft text-lavender
                             text-[0.68rem] font-semibold px-2.5 py-1 rounded-full">
                  {getAsanaDisplayName(slug)}
                </span>
              ))}
              {asanas.length > 4 && (
                <span className="bg-surface border border-edge text-ink-faint text-[0.68rem] px-2.5 py-1 rounded-full">
                  +{asanas.length - 4} more
                </span>
              )}
            </div>

            {/* Today's buttons */}
            {isToday && (
              <div className="flex flex-col gap-2">
                <button onClick={() => onStart(day)}
                  className="w-full py-2.5 rounded-xl bg-lavender text-white font-bold
                             text-[0.875rem] shadow-lavender hover:bg-lavender-dark
                             transition-all duration-200 hover:-translate-y-0.5">
                  {hasResume ? '▶ Resume Session' : '▶ Start Today\'s Session'}
                </button>
                {/* Skip Today — only if session not yet started */}
                {!hasResume && (
                  <button onClick={handleSkipToday} disabled={skipping}
                    className="w-full py-2 rounded-xl border border-edge text-ink-faint
                               text-[0.8rem] font-medium hover:border-amber-300 hover:text-amber-600
                               hover:bg-amber-50 transition-all duration-200 disabled:opacity-50">
                    {skipping ? 'Sending reminder…' : '⏭ Skip Today'}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function Schedule() {
  const { currentUser, userProfile } = useAuth()
  const navigate = useNavigate()
  const [hasResume, setHasResume] = useState(false)
  const [skipSent,  setSkipSent]  = useState(false)

  // Check for a paused session saved today
  useEffect(() => {
    if (!currentUser) return
    const ref = doc(db, 'users', currentUser.uid, 'meta', 'activeSession')
    getDoc(ref).then(snap => {
      if (snap.exists() && snap.data().dateKey === todayKey()) {
        setHasResume(true)
      }
    }).catch(() => {})
  }, [currentUser])

  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <LoadingSpinner label="Loading your schedule…" size="lg" />
      </div>
    )
  }

  const schedule = userProfile.weeklySchedule || []
  const todayIdx = (new Date().getDay() + 6) % 7

  async function handleSkipToday(day) {
    if (skipSent) return
    setSkipSent(true)
    try {
      await notifySkip({
        userEmail:        userProfile.email || '',
        telegramChatId:   userProfile.telegramChatId || null,
        userName:         userProfile.firstName || 'Yogi',
        asanaCount:       day.asanas.length,
        estimatedMinutes: Math.round(day.totalSecs / 60),
      })
    } catch (err) {
      console.warn('Skip notify failed (non-critical):', err)
    }
  }

  return (
    <main className="pt-20 min-h-screen pb-20">
      <div className="max-w-[1200px] mx-auto px-8 py-10">

        {/* Header */}
        <div className="mb-10 pb-7 border-b border-edge flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className="inline-block bg-lavender-pale border border-lavender-soft rounded-full
                             px-3.5 py-1 text-[0.68rem] font-semibold tracking-[0.1em] uppercase
                             text-lavender mb-3">Your Plan</span>
            <h1 className="font-display text-[1.9rem] font-extrabold tracking-tight text-ink mb-2">
              Weekly Schedule
            </h1>
            <div className="flex flex-wrap gap-3 mt-2">
              {userProfile.goal && (
                <span className="bg-surface border border-edge text-ink-muted text-[0.78rem]
                                 font-medium px-3 py-1.5 rounded-full">
                  {GOAL_LABELS[userProfile.goal] || userProfile.goal}
                </span>
              )}
              {userProfile.level && (
                <span className="bg-surface border border-edge text-ink-muted text-[0.78rem]
                                 font-medium px-3 py-1.5 rounded-full">
                  {LEVEL_LABELS[userProfile.level] || userProfile.level}
                </span>
              )}
            </div>
          </div>
            <button onClick={() => navigate('/onboarding?redo=true')}
            className="mt-4 px-5 py-2.5 rounded-xl border border-edge text-ink-muted text-[0.85rem]
                       font-medium hover:border-lavender-soft hover:text-lavender
                       hover:bg-lavender-pale transition-all duration-200">
            ✏️ Edit Preferences
          </button>
        </div>

        {/* Skip confirmation toast */}
        {skipSent && (
          <div className="mb-6 flex items-center gap-3 bg-amber-50 border border-amber-200
                          rounded-xl px-4 py-3 animate-fade-up">
            <span className="text-[1.2rem]">🧘</span>
            <p className="text-[0.85rem] text-amber-800 font-medium">
              Reminder sent! We'll nudge you to get back on track.
            </p>
          </div>
        )}

        {/* Schedule grid */}
        {schedule.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[2rem] mb-3">📅</p>
            <p className="font-display font-bold text-ink text-[1.1rem] mb-2">No schedule yet</p>
            <p className="text-ink-muted text-[0.88rem] mb-6">
              Complete the onboarding to generate your personalised weekly plan.
            </p>
            <button onClick={() => navigate('/onboarding')}
              className="px-7 py-3 rounded-xl bg-lavender text-white font-bold shadow-lavender
                         hover:bg-lavender-dark transition-all duration-200">
              Get Started →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {schedule.map(day => (
              <DayCard
                key={day.day}
                day={day}
                isToday={day.day === todayIdx}
                hasResume={day.day === todayIdx && hasResume}
                onStart={d => navigate('/session', { state: { day: d } })}
                onSkipToday={() => handleSkipToday(day)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
