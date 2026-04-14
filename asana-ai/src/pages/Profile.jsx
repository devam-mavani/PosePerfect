/**
 * pages/Profile.jsx
 *
 * Updated:
 *  - Added "Telegram Chat ID" field so users can receive Telegram notifications.
 *  - Shows a disclaimer banner if Telegram Chat ID is not set.
 *  - Saves telegramChatId to Firestore via updateUserProfile().
 */

import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const GENDER_OPTIONS = ['Prefer not to say', 'Male', 'Female', 'Non-binary', 'Other']

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

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col gap-1 py-4 border-b border-edge last:border-0">
      <span className="text-[0.72rem] font-semibold tracking-[0.1em] uppercase text-ink-faint">{label}</span>
      <span className="text-[0.95rem] font-medium text-ink">{value || '—'}</span>
    </div>
  )
}

export default function Profile() {
  const { currentUser, userProfile, updateUserProfile, logout } = useAuth()
  const navigate      = useNavigate()
  const [params]      = useSearchParams()
  const [editing,     setEditing]  = useState(params.get('edit') === 'true')
  const [saving,      setSaving]   = useState(false)
  const [error,       setError]    = useState('')
  const [success,     setSuccess]  = useState(false)

  const [form, setForm] = useState({
    firstName:      userProfile?.firstName      ?? '',
    lastName:       userProfile?.lastName       ?? '',
    age:            userProfile?.age            ?? '',
    gender:         userProfile?.gender         ?? '',
    telegramChatId: userProfile?.telegramChatId ?? '',
  })

  useEffect(() => {
    if (userProfile) {
      setForm({
        firstName:      userProfile.firstName      ?? '',
        lastName:       userProfile.lastName       ?? '',
        age:            userProfile.age            ?? '',
        gender:         userProfile.gender         ?? '',
        telegramChatId: userProfile.telegramChatId ?? '',
      })
    }
  }, [userProfile])

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    if (!form.age || isNaN(form.age) || Number(form.age) < 1)
      return setError('Please enter a valid age.')

    setSaving(true)
    try {
      await updateUserProfile({
        ...form,
        age: Number(form.age),
        // Store empty string as null so Firestore queries are consistent
        telegramChatId: form.telegramChatId.trim() || null,
      })
      setSuccess(true)
      setEditing(false)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setEditing(false)
    setError('')
    setForm({
      firstName:      userProfile?.firstName      ?? '',
      lastName:       userProfile?.lastName       ?? '',
      age:            userProfile?.age            ?? '',
      gender:         userProfile?.gender         ?? '',
      telegramChatId: userProfile?.telegramChatId ?? '',
    })
  }

  const initials = [userProfile?.firstName?.[0], userProfile?.lastName?.[0]]
    .filter(Boolean).join('').toUpperCase() || '?'

  const hasTelegram = !!userProfile?.telegramChatId

  return (
    <main className="pt-24 min-h-screen pb-20 px-4">
      <div className="max-w-xl mx-auto">

        {/* Avatar + name header */}
        <div className="text-center mb-8">
          {userProfile?.photoURL ? (
            <img
              src={userProfile.photoURL}
              alt="avatar"
              className="w-20 h-20 rounded-full object-cover mx-auto mb-4 shadow-lift"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-lavender shadow-lavender flex items-center
                            justify-center mx-auto mb-4 text-white font-bold text-2xl">
              {initials}
            </div>
          )}
          <h1 className="font-display text-[1.7rem] font-extrabold text-ink">
            {userProfile?.firstName} {userProfile?.lastName}
          </h1>
          <p className="text-ink-faint text-[0.85rem] mt-1">{userProfile?.email}</p>
          <span className="inline-block mt-2 px-3 py-1 rounded-full bg-lavender-pale border
                           border-lavender-soft text-lavender text-[0.7rem] font-semibold tracking-wide uppercase">
            {userProfile?.provider === 'google' ? '🔵 Google Account' : '📧 Email Account'}
          </span>
        </div>

        {/* ── Telegram disclaimer banner ── */}
        {!hasTelegram && (
          <div className="mb-5 flex items-start gap-3 bg-amber-50 border border-amber-200
                          text-amber-800 rounded-2xl px-5 py-4 text-[0.85rem]">
            <span className="text-xl shrink-0">✈️</span>
            <div>
              <p className="font-semibold">Telegram notifications not set up</p>
              <p className="text-amber-700 text-[0.8rem] mt-0.5">
                You won't receive Telegram messages for session summaries or reminders.
                Add your Telegram Chat ID below to enable them.
              </p>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="mt-2 text-[0.78rem] font-semibold text-amber-700 underline
                             underline-offset-2 hover:text-amber-900 transition-colors"
                >
                  ➕ Add Telegram ID now
                </button>
              )}
            </div>
          </div>
        )}

        {/* Success banner */}
        {success && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-green-50 border border-green-200
                          text-[0.85rem] text-status-ok font-medium text-center">
            ✓ Profile updated successfully!
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200
                          text-[0.85rem] text-status-bad">
            {error}
          </div>
        )}

        {/* Profile card */}
        <div className="bg-white border border-edge rounded-2xl shadow-card overflow-hidden">

          {/* Card header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-edge bg-surface">
            <h2 className="font-display font-bold text-[1rem] text-ink">
              {editing ? 'Edit Details' : 'Personal Details'}
            </h2>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 text-[0.82rem] font-semibold text-lavender
                           hover:text-lavender-dark transition-colors"
              >
                ✏️ Edit
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <EditField label="First Name" name="firstName" value={form.firstName} onChange={handleChange} placeholder="First name" required />
                <EditField label="Last Name"  name="lastName"  value={form.lastName}  onChange={handleChange} placeholder="Last name"  required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <EditField label="Age" name="age" type="number" value={form.age} onChange={handleChange} placeholder="Age" min="1" max="120" required />
                <div className="flex flex-col gap-1.5">
                  <label className="text-[0.78rem] font-semibold text-ink-muted">Gender</label>
                  <select
                    name="gender" value={form.gender} onChange={handleChange}
                    className="px-4 py-2.5 rounded-xl border border-edge bg-surface text-[0.875rem] text-ink
                               focus:outline-none focus:ring-2 focus:ring-lavender/30 focus:border-lavender
                               transition-all duration-200"
                  >
                    <option value="">Select…</option>
                    {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              {/* Email read-only */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.78rem] font-semibold text-ink-muted">Email Address</label>
                <input
                  type="email" value={userProfile?.email ?? ''} disabled
                  className="px-4 py-2.5 rounded-xl border border-edge bg-surface-mid text-[0.875rem]
                             text-ink-faint cursor-not-allowed"
                />
                <p className="text-[0.72rem] text-ink-faint">Email cannot be changed.</p>
              </div>

              {/* ── Telegram Chat ID field ── */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.78rem] font-semibold text-ink-muted">
                  ✈️ Telegram Chat ID <span className="text-ink-faint font-normal">(optional)</span>
                </label>
                <input
                  name="telegramChatId"
                  type="text"
                  value={form.telegramChatId}
                  onChange={handleChange}
                  placeholder="e.g. 1234567890"
                  className="px-4 py-2.5 rounded-xl border border-edge bg-surface text-[0.875rem] text-ink
                             placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-lavender/30
                             focus:border-lavender transition-all duration-200"
                />
                <p className="text-[0.72rem] text-ink-faint leading-relaxed">
                  Required to receive session summaries &amp; reminders on Telegram.{' '}
                  <span className="text-lavender font-medium">
                    To get your Chat ID: message <strong>@userinfobot</strong> on Telegram — it will reply with your numeric ID.
                  </span>
                </p>
              </div>

              <div className="flex gap-3 mt-1">
                <button
                  type="button" onClick={handleCancel}
                  className="flex-1 py-2.5 rounded-xl border border-edge text-ink-muted text-[0.875rem]
                             font-medium hover:bg-surface transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-lavender text-white text-[0.875rem]
                             font-bold shadow-lavender hover:bg-lavender-dark transition-all duration-200
                             disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="px-6">
              <InfoRow label="First Name"  value={userProfile?.firstName} />
              <InfoRow label="Last Name"   value={userProfile?.lastName}  />
              <InfoRow label="Age"         value={userProfile?.age}        />
              <InfoRow label="Gender"      value={userProfile?.gender}     />
              <InfoRow label="Email"       value={userProfile?.email}      />
              <InfoRow
                label="Telegram Chat ID"
                value={
                  userProfile?.telegramChatId
                    ? `✅ ${userProfile.telegramChatId}`
                    : '⚠️ Not set — Telegram notifications disabled'
                }
              />
            </div>
          )}
        </div>

        {/* ── Yoga Plan card — only shown after onboarding ── */}
        {userProfile?.onboardingDone && (
          <div className="mt-4 bg-white border border-edge rounded-2xl shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-edge bg-surface">
              <h2 className="font-display font-bold text-[1rem] text-ink">Yoga Plan</h2>
            </div>
            <div className="px-6">
              <InfoRow label="Goal"       value={GOAL_LABELS[userProfile?.goal]  || userProfile?.goal} />
              <InfoRow label="Level"      value={LEVEL_LABELS[userProfile?.level] || userProfile?.level} />
              <InfoRow label="Daily Time" value={
                userProfile?.practiceHours !== undefined
                  ? `${userProfile.practiceHours}h ${userProfile.practiceMinutes ?? 0}m`
                  : '—'
              } />
              <InfoRow label="Condition"  value={userProfile?.condition || '—'} />
              {userProfile?.scheduleUpdatedAt && (
                <InfoRow
                  label="Schedule Last Updated"
                  value={userProfile.scheduleUpdatedAt?.toDate?.()?.toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  }) ?? '—'}
                />
              )}
            </div>

            {/* Redo schedule button */}
            <div className="px-6 pb-5 pt-2">
              <button
                onClick={() => navigate('/onboarding?redo=true')}
                className="w-full py-2.5 rounded-xl border border-lavender-soft text-lavender
                           text-[0.875rem] font-semibold hover:bg-lavender-pale
                           transition-all duration-200 flex items-center justify-center gap-2"
              >
                🔄 Redo Schedule
                <span className="text-[0.72rem] text-lavender/70 font-normal">
                  (picks up newly added poses)
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Log out */}
        <button
          onClick={async () => { await logout(); navigate('/') }}
          className="mt-6 w-full py-3 rounded-xl border border-red-200 text-status-bad text-[0.875rem]
                     font-semibold hover:bg-red-50 transition-all duration-200"
        >
          🚪 Log Out
        </button>

      </div>
    </main>
  )
}

function EditField({ label, name, type = 'text', value, onChange, placeholder, ...rest }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[0.78rem] font-semibold text-ink-muted">{label}</label>
      <input
        name={name} type={type} value={value} onChange={onChange} placeholder={placeholder}
        className="px-4 py-2.5 rounded-xl border border-edge bg-surface text-[0.875rem] text-ink
                   placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-lavender/30
                   focus:border-lavender transition-all duration-200"
        {...rest}
      />
    </div>
  )
}
