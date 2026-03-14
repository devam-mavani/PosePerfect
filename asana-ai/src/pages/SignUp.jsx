/**
 * pages/SignUp.jsx
 *
 * Sign up via email/password (full form) or Google (redirects to /complete-profile).
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const GENDER_OPTIONS = ['Prefer not to say', 'Male', 'Female', 'Non-binary', 'Other']

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

export default function SignUp() {
  const { signUpWithEmail, loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    firstName: '', lastName: '', age: '', gender: '', email: '', password: '', confirm: '',
  })
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [gLoading, setGLoading] = useState(false)

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirm) return setError('Passwords do not match.')
    if (form.password.length < 6)       return setError('Password must be at least 6 characters.')
    if (!form.age || isNaN(form.age) || Number(form.age) < 1)
      return setError('Please enter a valid age.')
    if (!form.gender) return setError('Please select a gender.')

    setLoading(true)
    try {
      await signUpWithEmail(form)
      navigate('/')
    } catch (err) {
      const msg = err.code === 'auth/email-already-in-use'
        ? 'An account with this email already exists. Please log in.'
        : err.message
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError('')
    setGLoading(true)
    try {
      const { isNewUser } = await loginWithGoogle()
      navigate(isNewUser ? '/complete-profile' : '/')
    } catch (err) {
      setError(err.message)
    } finally {
      setGLoading(false)
    }
  }

  return (
    <main className="pt-24 min-h-screen flex items-start justify-center pb-16 px-4">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-lavender shadow-lavender flex items-center
                          justify-center mx-auto mb-4">
            <span className="text-2xl">🧘</span>
          </div>
          <h1 className="font-display text-[1.9rem] font-extrabold text-ink mb-1">Create account</h1>
          <p className="text-ink-muted text-[0.9rem]">
            Already have an account?{' '}
            <Link to="/login" className="text-lavender font-semibold hover:underline">Log in</Link>
          </p>
        </div>

        {/* Google button */}
        <button
          onClick={handleGoogle}
          disabled={gLoading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-edge
                     rounded-xl py-3 text-[0.9rem] font-semibold text-ink shadow-card
                     hover:border-lavender-soft hover:bg-lavender-pale transition-all duration-200
                     disabled:opacity-60 mb-5"
        >
          <GoogleIcon />
          {gLoading ? 'Connecting…' : 'Sign up with Google'}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-edge" />
          <span className="text-[0.75rem] text-ink-faint font-medium">or sign up with email</span>
          <div className="flex-1 h-px bg-edge" />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200
                          text-[0.85rem] text-status-bad">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white border border-edge rounded-2xl shadow-card p-7 flex flex-col gap-4">

          {/* Name row */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name" name="firstName" value={form.firstName} onChange={handleChange} placeholder="Arjun" required />
            <Field label="Last Name"  name="lastName"  value={form.lastName}  onChange={handleChange} placeholder="Mehta"  required />
          </div>

          {/* Age + Gender */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Age" name="age" type="number" value={form.age} onChange={handleChange} placeholder="25" min="1" max="120" required />
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.78rem] font-semibold text-ink-muted">Gender</label>
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                required
                className="px-4 py-2.5 rounded-xl border border-edge bg-surface text-[0.875rem]
                           text-ink focus:outline-none focus:ring-2 focus:ring-lavender/30
                           focus:border-lavender transition-all duration-200"
              >
                <option value="">Select…</option>
                {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          {/* Email */}
          <Field label="Email Address" name="email" type="email" value={form.email} onChange={handleChange} placeholder="arjun@example.com" required />

          {/* Password */}
          <Field label="Password" name="password" type="password" value={form.password} onChange={handleChange} placeholder="Min. 6 characters" required />
          <Field label="Confirm Password" name="confirm" type="password" value={form.confirm} onChange={handleChange} placeholder="Repeat password" required />

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full py-3 rounded-xl bg-lavender text-white font-bold text-[0.9rem]
                       shadow-lavender hover:bg-lavender-dark transition-all duration-200
                       hover:-translate-y-0.5 disabled:opacity-60 disabled:translate-y-0"
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-[0.75rem] text-ink-faint mt-5">
          By signing up you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </main>
  )
}

// ── Reusable input field ──────────────────────────────────────────────────────
function Field({ label, name, type = 'text', value, onChange, placeholder, ...rest }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[0.78rem] font-semibold text-ink-muted">{label}</label>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="px-4 py-2.5 rounded-xl border border-edge bg-surface text-[0.875rem] text-ink
                   placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-lavender/30
                   focus:border-lavender transition-all duration-200"
        {...rest}
      />
    </div>
  )
}
