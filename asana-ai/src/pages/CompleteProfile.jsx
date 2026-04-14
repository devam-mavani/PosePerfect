/**
 * pages/CompleteProfile.jsx
 *
 * Shown only to users who signed in with Google for the first time.
 * Collects the missing fields: firstName, lastName, age, gender.
 * Email is pre-filled and read-only from their Google account.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const GENDER_OPTIONS = ['Prefer not to say', 'Male', 'Female', 'Non-binary', 'Other']

export default function CompleteProfile() {
  const { userProfile, updateUserProfile } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    firstName: userProfile?.firstName ?? '',
    lastName:  userProfile?.lastName  ?? '',
    age:       userProfile?.age       ?? '',
    gender:    userProfile?.gender    ?? '',
  })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.age || isNaN(form.age) || Number(form.age) < 1)
      return setError('Please enter a valid age.')
    if (!form.gender) return setError('Please select a gender.')

    setLoading(true)
    try {
      await updateUserProfile({ ...form, age: Number(form.age) })
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="pt-24 min-h-screen flex items-start justify-center pb-16 px-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-lavender shadow-lavender flex items-center
                          justify-center mx-auto mb-4">
            <span className="text-2xl">✨</span>
          </div>
          <h1 className="font-display text-[1.8rem] font-extrabold text-ink mb-2">
            Complete your profile
          </h1>
          <p className="text-ink-muted text-[0.9rem] max-w-xs mx-auto">
            Just a few more details and you're all set!
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200
                          text-[0.85rem] text-status-bad">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-edge rounded-2xl shadow-card p-7 flex flex-col gap-4">

          {/* Email (read-only) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.78rem] font-semibold text-ink-muted">Email Address</label>
            <input
              type="email"
              value={userProfile?.email ?? ''}
              disabled
              className="px-4 py-2.5 rounded-xl border border-edge bg-surface-mid text-[0.875rem]
                         text-ink-faint cursor-not-allowed"
            />
          </div>

          {/* Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.78rem] font-semibold text-ink-muted">First Name</label>
              <input
                name="firstName" value={form.firstName} onChange={handleChange}
                placeholder="Arjun" required
                className="px-4 py-2.5 rounded-xl border border-edge bg-surface text-[0.875rem] text-ink
                           placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-lavender/30
                           focus:border-lavender transition-all duration-200"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.78rem] font-semibold text-ink-muted">Last Name</label>
              <input
                name="lastName" value={form.lastName} onChange={handleChange}
                placeholder="Mehta" required
                className="px-4 py-2.5 rounded-xl border border-edge bg-surface text-[0.875rem] text-ink
                           placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-lavender/30
                           focus:border-lavender transition-all duration-200"
              />
            </div>
          </div>

          {/* Age + Gender */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.78rem] font-semibold text-ink-muted">Age</label>
              <input
                name="age" type="number" value={form.age} onChange={handleChange}
                placeholder="25" min="1" max="120" required
                className="px-4 py-2.5 rounded-xl border border-edge bg-surface text-[0.875rem] text-ink
                           placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-lavender/30
                           focus:border-lavender transition-all duration-200"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.78rem] font-semibold text-ink-muted">Gender</label>
              <select
                name="gender" value={form.gender} onChange={handleChange} required
                className="px-4 py-2.5 rounded-xl border border-edge bg-surface text-[0.875rem] text-ink
                           focus:outline-none focus:ring-2 focus:ring-lavender/30 focus:border-lavender
                           transition-all duration-200"
              >
                <option value="">Select…</option>
                {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full py-3 rounded-xl bg-lavender text-white font-bold text-[0.9rem]
                       shadow-lavender hover:bg-lavender-dark transition-all duration-200
                       hover:-translate-y-0.5 disabled:opacity-60 disabled:translate-y-0"
          >
            {loading ? 'Saving…' : 'Save & Continue →'}
          </button>
        </form>

      </div>
    </main>
  )
}
