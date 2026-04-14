/**
 * pages/Dashboard.jsx
 *
 * User dashboard showing:
 *  - Current streak + longest streak
 *  - Last 30 days practice calendar
 *  - Pose mastery badges
 *  - Recent session history
 */

import { useEffect, useState } from 'react'
import { collection, getDocs, orderBy, query, limit, doc, getDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../contexts/AuthContext'
import BadgeDisplay from '../components/BadgeDisplay'
import LoadingSpinner from '../components/LoadingSpinner'

function formatDuration(s) {
  if (!s) return '—'
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

// ── Streak calendar (last 30 days) ───────────────────────────────────────────
function StreakCalendar({ practicedDates }) {
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400000)
    return {
      date:      d.toDateString(),
      label:     d.getDate(),
      practiced: practicedDates.has(d.toDateString()),
      isToday:   d.toDateString() === new Date().toDateString(),
    }
  })

  return (
    <div className="flex flex-wrap gap-1.5">
      {days.map(({ date, label, practiced, isToday }) => (
        <div
          key={date}
          title={date}
          className={[
            'w-8 h-8 rounded-lg flex items-center justify-center text-[0.7rem] font-semibold transition-all',
            practiced
              ? 'bg-lavender text-white shadow-lavender'
              : 'bg-surface-mid text-ink-faint',
            isToday ? 'ring-2 ring-lavender ring-offset-1' : '',
          ].join(' ')}
        >
          {label}
        </div>
      ))}
    </div>
  )
}

// ── Session history row ───────────────────────────────────────────────────────
function SessionRow({ session }) {
  const date = session.date
    ? new Date(session.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : '—'

  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-surface border border-edge/60">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-lavender-pale flex items-center justify-center shrink-0">
          <span className="text-lavender text-[0.85rem]">🧘</span>
        </div>
        <div>
          <p className="text-[0.85rem] font-semibold text-ink">
            {session.poses?.join(', ') || 'Session'}
          </p>
          <p className="text-[0.72rem] text-ink-faint">
            {date} · {formatDuration(session.durationSec)}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p
          className={`font-display font-bold text-[1rem] ${
            session.avgAccuracy >= 90 ? 'text-status-ok'
            : session.avgAccuracy >= 70 ? 'text-lavender'
            : 'text-ink-muted'
          }`}
        >
          {session.avgAccuracy ?? '—'}%
        </p>
        <p className="text-[0.68rem] text-ink-faint">accuracy</p>
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { currentUser } = useAuth()
  const [userData,  setUserData]  = useState(null)
  const [sessions,  setSessions]  = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    if (!currentUser) return

    async function load() {
      setLoading(true)
      try {
        const uid = currentUser.uid

        // Fetch user doc (streak, mastery)
        const userSnap = await getDoc(doc(db, 'users', uid))
        setUserData(userSnap.data() || {})

        // Fetch last 10 sessions
        const sessSnap = await getDocs(
          query(collection(db, 'users', uid, 'sessions'), orderBy('timestamp', 'desc'), limit(10))
        )
        setSessions(sessSnap.docs.map((d) => d.data()))
      } catch (err) {
        console.error('Dashboard load error:', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [currentUser])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <LoadingSpinner label="Loading your progress…" size="lg" />
      </div>
    )
  }

  const streak    = userData?.streak || 0
  const mastery   = userData?.mastery || {}
  const totalSess = userData?.totalSessions || 0

  // Build practiced dates set from sessions for calendar
  const practicedDates = new Set(
    sessions.map((s) => s.date ? new Date(s.date).toDateString() : null).filter(Boolean)
  )

  return (
    <main className="pt-20 min-h-screen pb-20">
      <div className="max-w-[1100px] mx-auto px-8 py-10">

        {/* Header */}
        <div className="mb-10 pb-7 border-b border-edge">
          <p className="text-[0.68rem] font-semibold tracking-[0.1em] uppercase text-lavender mb-2">
            Your Progress
          </p>
          <h1 className="font-display text-[1.9rem] font-extrabold text-ink">
            Dashboard
          </h1>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {[
            { icon: '🔥', label: 'Day Streak',     value: streak          },
            { icon: '🧘', label: 'Total Sessions',  value: totalSess       },
            { icon: '⭐', label: 'Poses Mastered',
              value: Object.values(mastery).filter((c) => c >= 10).length  },
            { icon: '🏆', label: 'Master Badges',
              value: Object.values(mastery).filter((c) => c >= 50).length  },
          ].map(({ icon, label, value }) => (
            <div key={label} className="bg-white border border-edge rounded-2xl p-5 shadow-card text-center">
              <div className="text-[1.6rem] mb-2">{icon}</div>
              <p className="font-display font-extrabold text-[1.8rem] text-ink leading-none mb-1">
                {value}
              </p>
              <p className="text-[0.72rem] text-ink-faint uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>

        {/* Streak Calendar */}
        <div className="bg-white border border-edge rounded-2xl shadow-card p-6 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-xl bg-lavender-pale flex items-center justify-center">
              <span>📅</span>
            </div>
            <div>
              <h2 className="font-display font-bold text-[1rem] text-ink">Practice Calendar</h2>
              <p className="text-[0.73rem] text-ink-faint">Last 30 days</p>
            </div>
            <div className="ml-auto flex items-center gap-2 bg-lavender-pale border border-lavender-soft
                            rounded-xl px-3 py-1.5">
              <span className="text-[1rem]">🔥</span>
              <span className="font-display font-bold text-lavender text-[0.9rem]">
                {streak} day{streak !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <StreakCalendar practicedDates={practicedDates} />
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-lavender" />
              <span className="text-[0.7rem] text-ink-faint">Practiced</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-surface-mid" />
              <span className="text-[0.7rem] text-ink-faint">Rest day</span>
            </div>
          </div>
        </div>

        {/* Mastery badges */}
        <div className="bg-white border border-edge rounded-2xl shadow-card p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-xl bg-lavender-pale flex items-center justify-center">
              <span>🏅</span>
            </div>
            <div>
              <h2 className="font-display font-bold text-[1rem] text-ink">Pose Mastery</h2>
              <p className="text-[0.73rem] text-ink-faint">
                Reach 90%+ accuracy consistently to level up
              </p>
            </div>
          </div>
          <BadgeDisplay mastery={mastery} mode="grid" />

          {/* Tier legend */}
          <div className="flex flex-wrap gap-3 mt-6 pt-5 border-t border-edge">
            {[
              { emoji: '🌱', label: 'Beginner',     req: 'Starting out'      },
              { emoji: '⭐', label: 'Novice',       req: '3 sessions'        },
              { emoji: '🔥', label: 'Practitioner', req: '10 sessions'       },
              { emoji: '💎', label: 'Expert',        req: '25 sessions'       },
              { emoji: '🏆', label: 'Master',        req: '50 sessions'       },
            ].map(({ emoji, label, req }) => (
              <div key={label} className="flex items-center gap-2 text-[0.72rem] text-ink-faint">
                <span>{emoji}</span>
                <span className="font-semibold text-ink">{label}</span>
                <span>— {req} at 90%+</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent sessions */}
        <div className="bg-white border border-edge rounded-2xl shadow-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-xl bg-lavender-pale flex items-center justify-center">
              <span>📋</span>
            </div>
            <h2 className="font-display font-bold text-[1rem] text-ink">Recent Sessions</h2>
          </div>

          {sessions.length === 0 ? (
            <p className="text-ink-faint text-[0.88rem] text-center py-6 italic">
              No sessions yet — start detecting to build your history!
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {sessions.map((s, i) => <SessionRow key={i} session={s} />)}
            </div>
          )}
        </div>

      </div>
    </main>
  )
}
