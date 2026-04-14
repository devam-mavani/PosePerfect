/**
 * pages/Onboarding.jsx
 *
 * Works in two modes:
 *  1. First-time  — shown after signup, must complete to proceed.
 *  2. Redo mode   — reached via /onboarding?redo=true from Profile or Schedule.
 *                   Pre-fills current values, lets user update and regenerate
 *                   their schedule with any newly added asanas.
 *
 * Redirects to /schedule on completion.
 */

import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../contexts/AuthContext'
import { generateWeeklySchedule, LEVEL_DURATION } from '../utils/scheduleGenerator'

const STEPS = ['goal', 'condition', 'duration', 'level']

const GOALS = [
  { id: 'fitness',     icon: '💪', title: 'Fitness & Strength',   desc: 'Build strength and improve flexibility' },
  { id: 'relax',       icon: '🧘', title: 'Relax & De-stress',    desc: 'Calm the mind and release tension' },
  { id: 'weight_loss', icon: '🔥', title: 'Weight Management',    desc: 'Active sessions to support healthy weight' },
  { id: 'balance',     icon: '⚖️', title: 'Balance & Posture',    desc: 'Improve stability and body alignment' },
  { id: 'breathing',   icon: '🌬️', title: 'Breathing & Wellness', desc: 'Focus on breath and overall wellbeing' },
]

const CONDITIONS = [
  { id: 'none',         label: 'No conditions' },
  { id: 'back_pain',    label: 'Back pain' },
  { id: 'knee_issues',  label: 'Knee issues' },
  { id: 'shoulder',     label: 'Shoulder problems' },
  { id: 'hypertension', label: 'High blood pressure' },
  { id: 'pregnancy',    label: 'Pregnancy' },
  { id: 'arthritis',    label: 'Arthritis / joint pain' },
  { id: 'other',        label: 'Other condition' },
]

const LEVELS = [
  {
    id:   'beginner',
    icon: '🌱',
    title: 'Beginner',
    desc: 'New to yoga — I will practise each pose for 30-40 seconds',
    duration: 35,
  },
  {
    id:   'intermediate',
    icon: '⭐',
    title: 'Intermediate',
    desc: 'Some experience — I can hold poses for about 1 minute',
    duration: 60,
  },
  {
    id:   'advanced',
    icon: '🔥',
    title: 'Advanced',
    desc: 'Experienced practitioner — I hold poses for 3 minutes',
    duration: 180,
  },
]

// ── Step components ───────────────────────────────────────────────────────────

function GoalStep({ value, onChange }) {
  return (
    <div className="flex flex-col gap-3">
      {GOALS.map(g => (
        <button
          key={g.id}
          onClick={() => onChange(g.id)}
          className={[
            'flex items-center gap-4 px-5 py-4 rounded-2xl border text-left transition-all duration-200',
            value === g.id
              ? 'bg-lavender text-white border-lavender shadow-lavender'
              : 'bg-white border-edge hover:border-lavender-soft hover:bg-lavender-pale',
          ].join(' ')}
        >
          <span className="text-[1.6rem] shrink-0">{g.icon}</span>
          <div>
            <p className={`font-display font-bold text-[0.95rem] ${value === g.id ? 'text-white' : 'text-ink'}`}>
              {g.title}
            </p>
            <p className={`text-[0.78rem] mt-0.5 ${value === g.id ? 'text-white/80' : 'text-ink-muted'}`}>
              {g.desc}
            </p>
          </div>
          {value === g.id && <span className="ml-auto text-white text-[1rem]">✓</span>}
        </button>
      ))}
    </div>
  )
}

function ConditionStep({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {CONDITIONS.map(c => (
        <button
          key={c.id}
          onClick={() => onChange(c.id)}
          className={[
            'px-4 py-3 rounded-xl border text-left text-[0.85rem] font-medium transition-all duration-200',
            value === c.id
              ? 'bg-lavender text-white border-lavender shadow-lavender'
              : 'bg-white border-edge text-ink hover:border-lavender-soft hover:bg-lavender-pale',
          ].join(' ')}
        >
          {c.label}
          {value === c.id && <span className="ml-2">✓</span>}
        </button>
      ))}
    </div>
  )
}

function DurationStep({ hours, minutes, onChange }) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-ink-muted text-[0.9rem]">
        How much time can you dedicate to yoga each day?
      </p>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="text-[0.78rem] font-semibold text-ink-muted uppercase tracking-wide block mb-3">
            Hours
          </label>
          <div className="flex gap-2">
            {[0, 1, 2].map(h => (
              <button key={h} onClick={() => onChange('hours', h)}
                className={[
                  'flex-1 py-3.5 rounded-xl border font-display font-bold text-[1.2rem] transition-all duration-200',
                  hours === h
                    ? 'bg-lavender text-white border-lavender shadow-lavender'
                    : 'bg-white border-edge text-ink hover:border-lavender-soft',
                ].join(' ')}>
                {h}h
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[0.78rem] font-semibold text-ink-muted uppercase tracking-wide block mb-3">
            Minutes
          </label>
          <div className="flex gap-2">
            {[0, 15, 30, 45].map(m => (
              <button key={m} onClick={() => onChange('minutes', m)}
                className={[
                  'flex-1 py-3.5 rounded-xl border font-display font-bold text-[0.9rem] transition-all duration-200',
                  minutes === m
                    ? 'bg-lavender text-white border-lavender shadow-lavender'
                    : 'bg-white border-edge text-ink hover:border-lavender-soft',
                ].join(' ')}>
                {m}m
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-lavender-pale border border-lavender-soft rounded-xl px-5 py-4 text-center">
        <p className="text-[0.72rem] text-lavender font-semibold uppercase tracking-wide mb-1">
          Daily Practice Time
        </p>
        <p className="font-display font-extrabold text-lavender text-[2rem]">
          {hours}h {minutes}m
        </p>
      </div>
    </div>
  )
}

function LevelStep({ value, onChange }) {
  return (
    <div className="flex flex-col gap-3">
      {LEVELS.map(l => (
        <button
          key={l.id}
          onClick={() => onChange(l.id)}
          className={[
            'flex items-center gap-4 px-5 py-4 rounded-2xl border text-left transition-all duration-200',
            value === l.id
              ? 'bg-lavender text-white border-lavender shadow-lavender'
              : 'bg-white border-edge hover:border-lavender-soft hover:bg-lavender-pale',
          ].join(' ')}
        >
          <span className="text-[1.8rem] shrink-0">{l.icon}</span>
          <div>
            <p className={`font-display font-bold text-[1rem] ${value === l.id ? 'text-white' : 'text-ink'}`}>
              {l.title}
            </p>
            <p className={`text-[0.78rem] mt-0.5 ${value === l.id ? 'text-white/80' : 'text-ink-muted'}`}>
              {l.desc}
            </p>
          </div>
          {value === l.id && <span className="ml-auto text-white text-[1.2rem]">✓</span>}
        </button>
      ))}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

const STEP_TITLES = {
  goal:      { title: 'What is your goal?',               sub: 'We will personalise your schedule around this.' },
  condition: { title: 'Any physical conditions?',         sub: 'We will avoid poses that may cause discomfort.' },
  duration:  { title: 'How long can you practise daily?', sub: 'Your schedule will fit within this window.' },
  level:     { title: 'What is your experience level?',   sub: 'This sets how long you will hold each pose.' },
}

export default function Onboarding() {
  const { currentUser, userProfile, updateUserProfile } = useAuth()
  const navigate    = useNavigate()
  const [params]    = useSearchParams()

  // redo=true means an existing user wants to redo their schedule
  const isRedo = params.get('redo') === 'true'

  const [stepIndex, setStepIndex] = useState(0)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  // Pre-fill with existing values when redoing
  const [form, setForm] = useState({
    goal:      userProfile?.goal      ?? '',
    condition: userProfile?.condition ?? '',
    hours:     userProfile?.practiceHours   ?? 0,
    minutes:   userProfile?.practiceMinutes ?? 30,
    level:     userProfile?.level     ?? '',
  })

  const currentStep = STEPS[stepIndex]
  const { title, sub } = STEP_TITLES[currentStep]

  const canNext = () => {
    if (currentStep === 'goal')      return !!form.goal
    if (currentStep === 'condition') return !!form.condition
    if (currentStep === 'duration')  return form.hours > 0 || form.minutes > 0
    if (currentStep === 'level')     return !!form.level
    return false
  }

  async function handleFinish() {
    setSaving(true)
    setError('')
    try {
      const levelInfo = LEVELS.find(l => l.id === form.level)
      const totalMins = form.hours * 60 + form.minutes
      // Re-generate schedule — this picks up any newly added poses automatically
      const schedule  = generateWeeklySchedule(form.goal, form.condition, form.level, totalMins)

      await updateUserProfile({
        goal:             form.goal,
        condition:        form.condition,
        practiceHours:    form.hours,
        practiceMinutes:  form.minutes,
        level:            form.level,
        poseDuration:     levelInfo.duration,
        weeklySchedule:   schedule,
        onboardingDone:   true,
        scheduleCreated:  serverTimestamp(),
        // Mark when schedule was last regenerated (useful for admin view)
        scheduleUpdatedAt: serverTimestamp(),
      })
      navigate('/schedule')
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  function handleDurationChange(field, val) {
    setForm(f => ({ ...f, [field]: val }))
  }

  const finishLabel = isRedo
    ? (saving ? 'Updating schedule…' : '🔄 Update My Schedule →')
    : (saving ? 'Creating your schedule…' : '🎉 Create My Schedule →')

  return (
    <main className="min-h-screen bg-surface pt-16 pb-20 px-4 flex items-start justify-center">
      <div className="w-full max-w-lg pt-8">

        {/* Redo banner */}
        {isRedo && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-brand-pale border border-brand/20
                          text-[0.85rem] text-brand font-medium flex items-center gap-2">
            <span>🔄</span>
            <span>
              Updating your schedule — new poses added since your last onboarding will be included automatically.
            </span>
          </div>
        )}

        {/* Progress bar */}
        <div className="flex gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className={[
              'flex-1 h-1.5 rounded-full transition-all duration-500',
              i <= stepIndex ? 'bg-lavender' : 'bg-surface-dark',
            ].join(' ')} />
          ))}
        </div>

        {/* Header */}
        <div className="mb-8">
          <p className="text-[0.7rem] font-semibold tracking-[0.1em] uppercase text-lavender mb-2">
            Step {stepIndex + 1} of {STEPS.length}
          </p>
          <h1 className="font-display text-[1.7rem] font-extrabold text-ink mb-1">{title}</h1>
          <p className="text-ink-muted text-[0.88rem]">{sub}</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200
                          text-[0.85rem] text-status-bad">{error}</div>
        )}

        {/* Step content */}
        <div className="mb-8">
          {currentStep === 'goal' && (
            <GoalStep value={form.goal} onChange={v => setForm(f => ({ ...f, goal: v }))} />
          )}
          {currentStep === 'condition' && (
            <ConditionStep value={form.condition} onChange={v => setForm(f => ({ ...f, condition: v }))} />
          )}
          {currentStep === 'duration' && (
            <DurationStep hours={form.hours} minutes={form.minutes} onChange={handleDurationChange} />
          )}
          {currentStep === 'level' && (
            <LevelStep value={form.level} onChange={v => setForm(f => ({ ...f, level: v }))} />
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {stepIndex > 0 && (
            <button
              onClick={() => setStepIndex(i => i - 1)}
              className="flex-1 py-3.5 rounded-xl border border-edge text-ink-muted font-semibold
                         text-[0.9rem] hover:bg-surface transition-all duration-200"
            >
              ← Back
            </button>
          )}
          {/* Cancel button — only shown in redo mode */}
          {isRedo && stepIndex === 0 && (
            <button
              onClick={() => navigate('/schedule')}
              className="flex-1 py-3.5 rounded-xl border border-edge text-ink-muted font-semibold
                         text-[0.9rem] hover:bg-surface transition-all duration-200"
            >
              Cancel
            </button>
          )}
          {stepIndex < STEPS.length - 1 ? (
            <button
              onClick={() => setStepIndex(i => i + 1)}
              disabled={!canNext()}
              className="flex-1 py-3.5 rounded-xl bg-lavender text-white font-bold text-[0.9rem]
                         shadow-lavender hover:bg-lavender-dark transition-all duration-200
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={!canNext() || saving}
              className="flex-1 py-3.5 rounded-xl bg-lavender text-white font-bold text-[0.9rem]
                         shadow-lavender hover:bg-lavender-dark transition-all duration-200
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {finishLabel}
            </button>
          )}
        </div>

      </div>
    </main>
  )
}
