/**
 * pages/Admin.jsx
 *
 * Admin dashboard — only accessible to mavanidevam30@gmail.com
 * Features:
 *  - All users list with profile details + onboarding form data
 *  - Per-user scorecard history (from Firestore sessions subcollection)
 *  - Send Telegram / Email message directly from the UI
 *
 * FIXES in this version:
 *  - MessagesTab now uses notifyAdminMessage() from api.js instead of raw axios.post()
 *    → uses the configured apiClient (timeout, interceptors, error normalisation)
 *  - Removed unused notifySession / notifySkip imports
 *  - Delivery log now reflects ACTUAL email/telegram delivery result (not just HTTP status)
 *    → ✅ if the channel delivered, ⚠️ if HTTP succeeded but delivery failed, ❌ on error
 *  - Telegram disclaimer shown inline when a target user has no telegramChatId and
 *    the selected send mode includes Telegram
 *  - fetchUsers catches Firestore permission errors and shows them clearly (unchanged)
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../contexts/AuthContext'
import { notifyAdminMessage } from '../services/api'
import { API_BASE_URL } from '../constants'

const ADMIN_EMAIL = 'mavanidevam30@gmail.com'

// ── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = ['👥 Users', '📊 Scorecards', '📨 Send Message']

// ── Helpers ──────────────────────────────────────────────────────────────────
function Badge({ children, color = 'brand' }) {
  const map = {
    brand:  'bg-brand/10 text-brand border-brand/20',
    green:  'bg-green-50 text-green-700 border-green-200',
    red:    'bg-red-50 text-red-600 border-red-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  }
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[0.7rem] font-semibold border ${map[color]}`}>
      {children}
    </span>
  )
}

function StatCard({ label, value, icon }) {
  return (
    <div className="bg-white border border-edge rounded-2xl p-5 shadow-card flex items-center gap-4">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-[0.75rem] text-ink-faint font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-[1.6rem] font-extrabold text-ink font-display">{value}</p>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex justify-center items-center py-16">
      <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

// ── Error Banner ──────────────────────────────────────────────────────────────
function ErrorBanner({ error, onDismiss }) {
  if (!error) return null
  return (
    <div className="mb-4 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 text-[0.85rem]">
      <span className="text-lg shrink-0">⚠️</span>
      <div className="flex-1">
        <p className="font-semibold">Firestore Error</p>
        <p className="font-mono text-[0.78rem] mt-0.5">{error}</p>
        {error.includes('permission') && (
          <p className="mt-1 text-red-500 text-[0.78rem]">
            Make sure your Firestore rules allow the admin email to read all users.
            See the updated rules in the setup guide.
          </p>
        )}
      </div>
      <button onClick={onDismiss} className="text-red-400 hover:text-red-600 transition-colors text-lg leading-none">✕</button>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Admin() {
  const { currentUser, loading } = useAuth()
  const navigate = useNavigate()

  const [tab,         setTab]         = useState(0)
  const [users,       setUsers]       = useState([])
  const [fetching,    setFetching]    = useState(true)
  const [fetchError,  setFetchError]  = useState(null)
  const [selected,    setSelected]    = useState(null)   // selected user for scorecard
  const [sessions,    setSessions]    = useState([])
  const [sessLoading, setSessLoading] = useState(false)
  const [msgResult,   setMsgResult]   = useState(null)

  // ── Guard: only admin ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && (!currentUser || currentUser.email !== ADMIN_EMAIL)) {
      navigate('/', { replace: true })
    }
  }, [currentUser, loading, navigate])

  // ── Fetch all users ────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setFetching(true)
    setFetchError(null)
    try {
      const snap = await getDocs(collection(db, 'users'))
      const list = snap.docs.map(d => ({ uid: d.id, ...d.data() }))
      setUsers(list)
    } catch (e) {
      console.error('Failed to fetch users:', e.code, e.message)

      // On permission-denied, the auth token might still be hydrating —
      // wait 1 second and try once more before showing the error.
      if (e.code === 'permission-denied') {
        try {
          await new Promise(r => setTimeout(r, 1000))
          const snap = await getDocs(collection(db, 'users'))
          const list = snap.docs.map(d => ({ uid: d.id, ...d.data() }))
          setUsers(list)
          setFetchError(null)
          return
        } catch (retryErr) {
          setFetchError(`permission-denied — Firestore rules are blocking admin reads. ${retryErr.message}`)
        }
      } else {
        setFetchError(`${e.code}: ${e.message}`)
      }
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  // ── Fetch sessions for selected user ──────────────────────────────────────
  async function fetchSessions(uid) {
    setSessLoading(true)
    setSessions([])
    try {
      const q = query(
        collection(db, 'users', uid, 'sessions'),
        orderBy('date', 'desc'),
        limit(20),
      )
      const snap = await getDocs(q)
      setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (e) {
      console.error('Failed to fetch sessions:', e.code, e.message)
      // sessions subcollection may not exist yet — silent fail is fine
      setSessions([])
    } finally {
      setSessLoading(false)
    }
  }

  function handleSelectUser(user) {
    setSelected(user)
    setTab(1)
    fetchSessions(user.uid)
  }

  if (loading || !currentUser) return null
  if (currentUser.email !== ADMIN_EMAIL) return null

  const totalUsers  = users.length
  const googleUsers = users.filter(u => u.provider === 'google').length
  const onboarded   = users.filter(u => u.onboardingDone).length

  return (
    <main className="pt-24 min-h-screen pb-20 px-4 bg-surface">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">🛡️</span>
            <h1 className="font-display text-[2rem] font-extrabold text-ink">Admin Panel</h1>
            <Badge color="red">Private</Badge>
          </div>
          <p className="text-ink-faint text-[0.85rem]">Logged in as {currentUser.email}</p>
        </div>

        {/* Error banner */}
        <ErrorBanner error={fetchError} onDismiss={() => setFetchError(null)} />

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard label="Total Users"    value={totalUsers}  icon="👥" />
          <StatCard label="Google Sign-in" value={googleUsers} icon="🔵" />
          <StatCard label="Onboarded"      value={onboarded}   icon="✅" />
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 mb-6 border-b border-edge pb-3">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              className={[
                'px-5 py-2 rounded-xl text-[0.85rem] font-semibold transition-all duration-200',
                tab === i
                  ? 'bg-brand text-white shadow-brand'
                  : 'text-ink-muted hover:bg-brand-pale hover:text-brand',
              ].join(' ')}>
              {t}
            </button>
          ))}
        </div>

        {/* ── Tab 0: Users ── */}
        {tab === 0 && (
          <UsersTab
            users={users}
            fetching={fetching}
            onRefresh={fetchUsers}
            onSelectUser={handleSelectUser}
          />
        )}

        {/* ── Tab 1: Scorecards ── */}
        {tab === 1 && (
          <ScorecardsTab
            users={users}
            selected={selected}
            sessions={sessions}
            sessLoading={sessLoading}
            onSelectUser={u => { setSelected(u); fetchSessions(u.uid) }}
          />
        )}

        {/* ── Tab 2: Send Message ── */}
        {tab === 2 && (
          <MessagesTab
            users={users}
            result={msgResult}
            setResult={setMsgResult}
          />
        )}

      </div>
    </main>
  )
}


// ══════════════════════════════════════════════════════════════════════════════
// Tab 1 — Users
// ══════════════════════════════════════════════════════════════════════════════
function UsersTab({ users, fetching, onRefresh, onSelectUser }) {
  const [search,   setSearch]   = useState('')
  const [expanded, setExpanded] = useState(null)

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return (
      u.email?.toLowerCase().includes(q) ||
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q)
    )
  })

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl border border-edge bg-white text-[0.875rem]
                     focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
        />
        <button onClick={onRefresh}
          className="px-4 py-2.5 rounded-xl border border-edge text-ink-muted text-[0.85rem]
                     hover:bg-brand-pale hover:text-brand transition-all">
          🔄 Refresh
        </button>
      </div>

      {fetching ? <Spinner /> : (
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-ink-faint gap-3">
              <span className="text-4xl">👤</span>
              <p className="text-[0.9rem]">No users found.</p>
              <p className="text-[0.78rem]">
                If you expect users here, check that your Firestore rules allow admin reads.
              </p>
            </div>
          )}
          {filtered.map(user => (
            <UserRow
              key={user.uid}
              user={user}
              expanded={expanded === user.uid}
              onToggle={() => setExpanded(expanded === user.uid ? null : user.uid)}
              onViewScorecard={() => onSelectUser(user)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function UserRow({ user, expanded, onToggle, onViewScorecard }) {
  const initials = [user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?'
  const joinDate = user.createdAt?.toDate?.()?.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) ?? '—'

  return (
    <div className="bg-white border border-edge rounded-2xl shadow-card overflow-hidden">
      {/* Row header */}
      <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-surface transition-colors"
           onClick={onToggle}>
        {/* Avatar */}
        {user.photoURL ? (
          <img src={user.photoURL} alt="avatar" className="w-10 h-10 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center text-white font-bold text-sm shrink-0">
            {initials}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-ink text-[0.9rem]">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-ink-faint text-[0.78rem] truncate">{user.email}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge color={user.provider === 'google' ? 'brand' : 'purple'}>
            {user.provider === 'google' ? '🔵 Google' : '📧 Email'}
          </Badge>
          <Badge color={user.onboardingDone ? 'green' : 'yellow'}>
            {user.onboardingDone ? 'Onboarded' : 'Pending'}
          </Badge>
          <span className="text-ink-faint text-[0.7rem]">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-edge px-5 py-4 bg-surface">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <Detail label="Age"     value={user.age || '—'} />
            <Detail label="Gender"  value={user.gender || '—'} />
            <Detail label="Joined"  value={joinDate} />
            <Detail label="UID"     value={user.uid.slice(0, 12) + '…'} />
          </div>

          {/* Onboarding form data */}
          {user.onboardingDone && (
            <>
              <p className="text-[0.72rem] font-semibold tracking-widest uppercase text-ink-faint mb-2 mt-3">
                Onboarding Form
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Detail label="Goal"           value={user.goal} />
                <Detail label="Experience"     value={user.experience} />
                <Detail label="Days / Week"    value={user.daysPerWeek} />
                <Detail label="Session Length" value={user.sessionLength ? `${user.sessionLength} min` : '—'} />
                <Detail
                  label="Telegram ID"
                  value={
                    user.telegramChatId
                      ? `✅ ${user.telegramChatId}`
                      : '⚠️ Not set'
                  }
                />
                <Detail label="Last Practice"  value={user.lastPracticeDate || '—'} />
              </div>
            </>
          )}

          {/* Weekly schedule preview */}
          {user.weeklySchedule?.length > 0 && (
            <>
              <p className="text-[0.72rem] font-semibold tracking-widest uppercase text-ink-faint mb-2 mt-4">
                Weekly Schedule
              </p>
              <div className="flex flex-wrap gap-2">
                {user.weeklySchedule.map((day, i) => (
                  <div key={i} className={`px-3 py-1.5 rounded-lg text-[0.75rem] font-medium border
                    ${day.isRest
                      ? 'bg-surface border-edge text-ink-faint'
                      : 'bg-brand-pale border-brand/20 text-brand'}`}>
                    {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][day.day ?? i]}
                    {!day.isRest && ` · ${day.asanas?.length ?? 0} poses`}
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="flex gap-2 mt-4">
            <button onClick={onViewScorecard}
              className="px-4 py-2 rounded-xl bg-brand text-white text-[0.82rem] font-semibold
                         hover:bg-brand-bright transition-all shadow-brand">
              📊 View Scorecards
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="text-[0.85rem] font-medium text-ink mt-0.5">{value ?? '—'}</p>
    </div>
  )
}


// ══════════════════════════════════════════════════════════════════════════════
// Tab 2 — Scorecards
// ══════════════════════════════════════════════════════════════════════════════
function ScorecardsTab({ users, selected, sessions, sessLoading, onSelectUser }) {
  return (
    <div className="flex gap-6">
      {/* Left: user picker */}
      <div className="w-64 shrink-0">
        <p className="text-[0.75rem] font-semibold text-ink-faint uppercase tracking-wide mb-3">Select User</p>
        <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
          {users.length === 0 && (
            <p className="text-[0.78rem] text-ink-faint px-2">No users loaded yet.</p>
          )}
          {users.map(u => {
            const initials = [u.firstName?.[0], u.lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?'
            return (
              <button key={u.uid} onClick={() => onSelectUser(u)}
                className={[
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left',
                  selected?.uid === u.uid
                    ? 'border-brand bg-brand-pale text-brand'
                    : 'border-edge bg-white text-ink hover:bg-surface',
                ].join(' ')}>
                {u.photoURL ? (
                  <img src={u.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white text-xs font-bold">
                    {initials}
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="text-[0.82rem] font-semibold truncate">{u.firstName} {u.lastName}</p>
                  <p className="text-[0.7rem] text-ink-faint truncate">{u.email}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right: sessions */}
      <div className="flex-1">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-64 text-ink-faint gap-3">
            <span className="text-4xl">👈</span>
            <p className="text-[0.9rem]">Select a user to view their scorecards</p>
          </div>
        ) : sessLoading ? <Spinner /> : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-ink-faint gap-3">
            <span className="text-4xl">📭</span>
            <p className="text-[0.9rem]">No sessions recorded yet for {selected.firstName}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-[0.85rem] text-ink-faint font-medium">
              Showing last {sessions.length} sessions for <strong className="text-ink">{selected.firstName} {selected.lastName}</strong>
            </p>
            {sessions.map(sess => (
              <SessionCard key={sess.id} session={sess} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SessionCard({ session }) {
  const [open, setOpen] = useState(false)

  const completed = session.completedAsanas ?? []
  const skipped   = session.skippedAsanas   ?? []
  const accuracies= session.accuracies      ?? {}

  return (
    <div className="bg-white border border-edge rounded-2xl shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-surface transition-colors"
           onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-3">
          <span className="text-xl">{session.status === 'completed' ? '✅' : '⚡'}</span>
          <div>
            <p className="font-semibold text-ink text-[0.9rem]">{session.dayName} · {session.date}</p>
            <p className="text-ink-faint text-[0.78rem]">
              Avg accuracy: <strong className="text-brand">{session.avgAccuracy ?? '—'}%</strong>
              {' · '}Duration: {session.durationSec ? `${Math.round(session.durationSec / 60)}m` : '—'}
              {' · '}Streak: {session.streak ?? 0} 🔥
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge color={session.status === 'completed' ? 'green' : 'yellow'}>
            {session.status === 'completed' ? 'Completed' : 'Partial'}
          </Badge>
          <span className="text-ink-faint text-[0.7rem]">{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div className="border-t border-edge px-5 py-4 bg-surface">
          {completed.length > 0 && (
            <div className="mb-4">
              <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-ink-faint mb-2">Completed Poses</p>
              <div className="flex flex-wrap gap-2">
                {completed.map(([slug, name]) => (
                  <div key={slug} className="px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-[0.78rem] font-medium text-green-700">
                    ✓ {name}
                    {accuracies[slug] !== undefined && (
                      <span className="ml-1.5 text-green-500 font-bold">{accuracies[slug]}%</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {skipped.length > 0 && (
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-ink-faint mb-2">Skipped Poses</p>
              <div className="flex flex-wrap gap-2">
                {skipped.map(([slug, name]) => (
                  <div key={slug} className="px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-[0.78rem] font-medium text-red-600">
                    ✗ {name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


// ══════════════════════════════════════════════════════════════════════════════
// Tab 3 — Send Message
// ══════════════════════════════════════════════════════════════════════════════
function MessagesTab({ users, result, setResult }) {
  const [mode,      setMode]      = useState('email')
  const [recipient, setRecipient] = useState('all')
  const [subject,   setSubject]   = useState('')
  const [message,   setMessage]   = useState('')
  const [sending,   setSending]   = useState(false)
  const [logs,      setLogs]      = useState([])

  const targets = recipient === 'all'
    ? users
    : users.filter(u => u.uid === recipient)

  // Users without a Telegram Chat ID when Telegram is selected
  const telegramMode   = mode === 'telegram' || mode === 'both'
  const noTelegramList = telegramMode
    ? targets.filter(u => !u.telegramChatId)
    : []

  async function handleSend() {
    if (!message.trim()) return
    setSending(true)
    setLogs([])
    setResult(null)

    const newLogs = []

    for (const user of targets) {
      try {
        const payload = {
          userEmail:        mode !== 'telegram' ? (user.email || '') : '',
          telegramChatId:   mode !== 'email'    ? (user.telegramChatId || '') : '',
          userName:         user.firstName || 'Yogi',
          customMessage:    message,
          subject:          subject || 'Message from PosePerfect',
          asanaCount:       0,
          estimatedMinutes: 0,
        }

        // FIX: use notifyAdminMessage from api.js (uses apiClient with
        // timeout + interceptors) instead of raw axios.post()
        const res = await notifyAdminMessage(payload)

        // Determine actual delivery status from the response, not just HTTP status
        const emailOk    = mode !== 'telegram' ? res.sent?.email    === true : null
        const telegramOk = mode !== 'email'    ? res.sent?.telegram === true : null
        const emailError = res.sent?.emailError ?? null   // ← new: specific failure reason

        const channels = []
        if (emailOk    === true)  channels.push('📧 email ✓')
        if (emailOk    === false) channels.push(`📧 email ✗${emailError ? ` — ${emailError}` : ''}`)
        if (telegramOk === true)  channels.push('✈️ telegram ✓')
        if (telegramOk === false) channels.push('✈️ telegram ✗')

        const anyDelivered = emailOk === true || telegramOk === true
        const status = anyDelivered ? '✅ delivered' : '⚠️ not delivered'

        newLogs.push({
          user:    user.email,
          status,
          detail:  channels.join('  ·  ') || JSON.stringify(res.sent),
        })
      } catch (err) {
        newLogs.push({
          user:   user.email,
          status: '❌ error',
          detail: err.message,
        })
      }
    }

    setLogs(newLogs)
    setSending(false)
    setResult({ total: targets.length, logs: newLogs })
  }

  return (
    <div className="max-w-2xl">
      <p className="text-[0.85rem] text-ink-faint mb-6">
        Send a custom message to one or all users via Email or Telegram directly from here.
      </p>

      {/* Recipient */}
      <div className="mb-4">
        <label className="block text-[0.78rem] font-semibold text-ink-muted mb-1.5">Recipient</label>
        <select value={recipient} onChange={e => setRecipient(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-edge bg-white text-[0.875rem] text-ink
                     focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all">
          <option value="all">📢 All Users ({users.length})</option>
          {users.map(u => (
            <option key={u.uid} value={u.uid}>
              {u.firstName} {u.lastName} — {u.email}
              {!u.telegramChatId ? ' (no Telegram)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Channel */}
      <div className="mb-4">
        <label className="block text-[0.78rem] font-semibold text-ink-muted mb-1.5">Send via</label>
        <div className="flex gap-2">
          {[
            { value: 'email',    label: '📧 Email only' },
            { value: 'telegram', label: '✈️ Telegram only' },
            { value: 'both',     label: '📨 Both' },
          ].map(opt => (
            <button key={opt.value} onClick={() => setMode(opt.value)}
              className={[
                'px-4 py-2 rounded-xl border text-[0.82rem] font-semibold transition-all',
                mode === opt.value
                  ? 'bg-brand text-white border-brand shadow-brand'
                  : 'bg-white text-ink-muted border-edge hover:bg-brand-pale hover:text-brand',
              ].join(' ')}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Telegram disclaimer: shown when Telegram is selected + some targets have no chat ID ── */}
      {telegramMode && noTelegramList.length > 0 && (
        <div className="mb-4 flex items-start gap-3 bg-amber-50 border border-amber-200
                        text-amber-800 rounded-2xl px-4 py-3 text-[0.82rem]">
          <span className="text-lg shrink-0">⚠️</span>
          <div>
            <p className="font-semibold">
              {noTelegramList.length === targets.length
                ? 'No Telegram messages will be sent'
                : `${noTelegramList.length} of ${targets.length} user${targets.length > 1 ? 's' : ''} won't receive Telegram messages`}
            </p>
            <p className="text-amber-700 mt-0.5">
              The following {noTelegramList.length > 1 ? 'users have' : 'user has'} no Telegram Chat ID saved in their profile:
            </p>
            <ul className="mt-1 space-y-0.5">
              {noTelegramList.map(u => (
                <li key={u.uid} className="font-mono text-[0.75rem] text-amber-700">
                  • {u.firstName} {u.lastName} ({u.email})
                </li>
              ))}
            </ul>
            <p className="text-amber-600 mt-1.5 text-[0.75rem]">
              Users can add their Telegram Chat ID in their Profile page.
            </p>
          </div>
        </div>
      )}

      {/* Subject (email only) */}
      {mode !== 'telegram' && (
        <div className="mb-4">
          <label className="block text-[0.78rem] font-semibold text-ink-muted mb-1.5">Subject</label>
          <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
            placeholder="e.g. Your PosePerfect Weekly Update"
            className="w-full px-4 py-2.5 rounded-xl border border-edge bg-white text-[0.875rem] text-ink
                       focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all" />
        </div>
      )}

      {/* Message */}
      <div className="mb-6">
        <label className="block text-[0.78rem] font-semibold text-ink-muted mb-1.5">Message</label>
        <textarea value={message} onChange={e => setMessage(e.target.value)}
          rows={5} placeholder="Type your message here…"
          className="w-full px-4 py-3 rounded-xl border border-edge bg-white text-[0.875rem] text-ink
                     focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all resize-none" />
        <p className="text-[0.72rem] text-ink-faint mt-1">
          Sending to <strong>{recipient === 'all' ? `all ${users.length} users` : targets[0]?.email}</strong> via {mode}.
        </p>
      </div>

      <button onClick={handleSend} disabled={sending || !message.trim()}
        className="w-full py-3 rounded-xl bg-brand text-white font-bold text-[0.9rem] shadow-brand
                   hover:bg-brand-bright transition-all disabled:opacity-50 disabled:cursor-not-allowed">
        {sending ? '⏳ Sending…' : `🚀 Send to ${recipient === 'all' ? 'All Users' : targets[0]?.firstName}`}
      </button>

      {/* Logs */}
      {logs.length > 0 && (
        <div className="mt-6">
          <p className="text-[0.78rem] font-semibold text-ink-muted uppercase tracking-wide mb-2">Delivery Log</p>
          <div className="bg-white border border-edge rounded-2xl overflow-hidden divide-y divide-edge">
            {logs.map((l, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <span className="text-sm shrink-0">{l.status}</span>
                <div>
                  <p className="text-[0.82rem] font-medium text-ink">{l.user}</p>
                  <p className="text-[0.72rem] text-ink-faint font-mono">{l.detail}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          {(() => {
            const delivered = logs.filter(l => l.status === '✅ delivered').length
            const failed    = logs.filter(l => l.status !== '✅ delivered').length
            return (
              <p className="text-[0.78rem] text-ink-faint mt-2">
                <strong className="text-status-ok">{delivered}</strong> delivered ·{' '}
                <strong className={failed > 0 ? 'text-status-bad' : 'text-ink-faint'}>{failed}</strong> not delivered
              </p>
            )
          })()}
        </div>
      )}
    </div>
  )
}
