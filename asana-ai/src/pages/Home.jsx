/**
 * pages/Home.jsx — Grey & White redesign
 * Updated: Shows ALL asanas from ASANA_LIBRARY with intensity + goals badges.
 *          Stats counter updated to reflect actual count.
 */

import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { ASANA_LIBRARY } from '../utils/scheduleGenerator'

// ── Derive full pose list from the library ───────────────────────────────────
const ALL_POSES = Object.entries(ASANA_LIBRARY).map(([slug, info]) => ({
  slug,
  name:      info.name,
  intensity: info.intensity || 'light',
  goals:     info.goals     || [],
}))

const TOTAL_POSES = ALL_POSES.length  // always accurate

const INTENSITY_META = {
  light:    { label: 'Light',    color: '#10B981', bg: '#D1FAE5', dot: '🟢' },
  moderate: { label: 'Moderate', color: '#7C6FCD', bg: '#EDE9FE', dot: '🟣' },
  intense:  { label: 'Intense',  color: '#EF4444', bg: '#FEE2E2', dot: '🔴' },
}

const GOAL_LABELS = {
  fitness:     'Fitness',
  balance:     'Balance',
  relax:       'Relax',
  weight_loss: 'Weight Loss',
  breathing:   'Breathing',
}

const FEATURES = [
  { icon: '🎯', title: 'Real-Time Detection',  desc: 'CNN model analyses your webcam every 3 seconds and identifies your pose with high accuracy.' },
  { icon: '🗣️', title: 'Voice Guidance',       desc: 'Natural language corrections spoken aloud — "lift your left arm slightly upwards" — every 3 seconds.' },
  { icon: '📅', title: 'Smart Scheduling',     desc: 'Personalised weekly plan based on your goal, fitness level, and available practice time.' },
  { icon: '📸', title: 'Auto Snapshot',        desc: 'Captures a photo automatically when your accuracy crosses 85% — perfect form saved to Drive.' },
  { icon: '📊', title: 'Progress Tracking',    desc: 'Streak calendar, mastery badges for every pose, and session history — all in your profile.' },
  { icon: '📬', title: 'Weekly Reports',       desc: 'Every weekend get an email summary of your streak, accuracy, and top poses.' },
]

// ── Animated counter ──────────────────────────────────────────────────────────
function Counter({ to, suffix = '' }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      let start = 0
      const step = () => {
        start += Math.ceil(to / 40)
        if (start >= to) { setCount(to); return }
        setCount(start)
        requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [to])
  return <span ref={ref}>{count}{suffix}</span>
}

// ── Pose card ─────────────────────────────────────────────────────────────────
function PoseCard({ name, intensity, goals }) {
  const meta = INTENSITY_META[intensity] || INTENSITY_META.light
  return (
    <div className="bg-white border border-edge rounded-2xl p-5 shadow-card
                    hover:border-brand hover:shadow-brand-sm hover:-translate-y-0.5
                    transition-all duration-300 group flex flex-col gap-3">
      {/* Intensity badge */}
      <div className="flex items-center justify-between">
        <span
          className="text-[0.67rem] font-bold uppercase tracking-[0.1em] px-2.5 py-1 rounded-full"
          style={{ color: meta.color, background: meta.bg }}
        >
          {meta.dot} {meta.label}
        </span>
      </div>

      {/* Name */}
      <p className="font-display font-bold text-[0.9rem] text-ink leading-snug
                    group-hover:text-brand transition-colors duration-200">
        {name}
      </p>

      {/* Goal pills */}
      {goals.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-auto">
          {goals.slice(0, 3).map(g => (
            <span
              key={g}
              className="text-[0.62rem] font-semibold bg-surface-mid text-ink-faint
                         px-2 py-0.5 rounded-full"
            >
              {GOAL_LABELS[g] || g}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Intensity filter pill ─────────────────────────────────────────────────────
function FilterPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-4 py-1.5 rounded-full text-[0.8rem] font-semibold border transition-all duration-200',
        active
          ? 'bg-brand text-white border-brand shadow-brand-sm'
          : 'bg-white text-ink-muted border-edge hover:border-brand hover:text-brand',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all'
    ? ALL_POSES
    : ALL_POSES.filter(p => p.intensity === filter)

  return (
    <div className="relative overflow-x-hidden bg-white">

      {/* ── HERO ── */}
      <section className="relative z-10 min-h-screen flex flex-col items-center
                           justify-center text-center px-6 pt-24 pb-16">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-brand-pale border border-brand-soft
                        rounded-full px-4 py-1.5 mb-8 animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
          <span className="text-brand text-[0.72rem] font-semibold tracking-[0.12em] uppercase">
            AI-Powered Yoga Coach
          </span>
        </div>

        {/* Heading */}
        <h1 className="font-display text-[clamp(2.8rem,8vw,6rem)] font-black
                        leading-[1.05] tracking-tight text-ink mb-6 animate-fade-up
                        max-w-[900px]">
          Perfect Your Pose.<br />
          <span className="gradient-text">Every Time.</span>
        </h1>

        <p className="text-ink-muted text-[1.05rem] leading-[1.8] max-w-[540px]
                       mb-10 animate-fade-up" style={{ animationDelay: '0.1s' }}>
          PosePerfect uses computer vision and AI to detect your yoga form in real time,
          guide you step by step, and track your progress week over week.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 animate-fade-up"
             style={{ animationDelay: '0.2s' }}>
          <button
            onClick={() => navigate('/signup')}
            className="btn-brand-shimmer px-8 py-4 text-[1rem] font-display font-bold shadow-brand-lg
                       hover:-translate-y-1 transition-transform duration-200">
            Start Practising Free →
          </button>
          <button
            onClick={() => navigate('/detection')}
            className="px-8 py-4 rounded-2xl bg-white border border-edge text-ink
                       font-semibold text-[1rem] hover:border-brand hover:bg-brand-pale
                       transition-all duration-200">
            Try Detection
          </button>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-float">
          <div className="w-6 h-10 rounded-full border-2 border-edge flex
                          items-start justify-center pt-2">
            <div className="w-1 h-2 rounded-full bg-brand animate-bounce" />
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="relative z-10 py-16 dot-grid bg-surface-mid">
        <div className="max-w-[900px] mx-auto px-6">
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: TOTAL_POSES, suffix: '',  label: 'Yoga Asanas' },
              { value: 85,          suffix: '%', label: 'Snapshot Accuracy' },
              { value: 3,           suffix: 's', label: 'Detection Interval' },
            ].map((s, i) => (
              <div key={i}
                className="bg-white border border-edge rounded-2xl p-6 text-center card-hover shadow-card">
                <p className="font-display font-black text-[2.8rem] text-brand leading-none mb-1">
                  <Counter to={s.value} suffix={s.suffix} />
                </p>
                <p className="text-ink-faint text-[0.78rem] uppercase tracking-widest font-medium">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="relative z-10 py-24 px-6 bg-white">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-14">
            <span className="text-brand text-[0.72rem] font-semibold tracking-[0.15em]
                             uppercase block mb-3">Features</span>
            <h2 className="font-display text-[2.4rem] font-black text-ink leading-tight">
              Everything you need to<br />
              <span className="gradient-text">master yoga</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div key={i}
                className="bg-surface border border-edge rounded-2xl p-6 card-hover
                           hover:border-brand-muted transition-all duration-300 group shadow-card">
                <div className="w-12 h-12 rounded-xl bg-brand-pale border border-brand-soft
                                flex items-center justify-center text-[1.4rem] mb-4
                                group-hover:bg-brand group-hover:border-brand
                                group-hover:scale-110 transition-all duration-300">
                  {f.icon}
                </div>
                <h3 className="font-display font-bold text-[1rem] text-ink mb-2">{f.title}</h3>
                <p className="text-ink-muted text-[0.84rem] leading-[1.7]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ALL ASANAS ── */}
      <section className="relative z-10 py-24 px-6 bg-surface-mid">
        <div className="max-w-[1200px] mx-auto">

          {/* Header */}
          <div className="text-center mb-12">
            <span className="text-brand text-[0.72rem] font-semibold tracking-[0.15em]
                             uppercase block mb-3">Our Library</span>
            <h2 className="font-display text-[2.2rem] font-black text-ink mb-3">
              {TOTAL_POSES} Yoga Asanas
            </h2>
            <p className="text-ink-muted text-[0.9rem] max-w-[480px] mx-auto leading-relaxed">
              From beginner-friendly resting poses to intense inversions — a full range
              for every goal, level, and condition.
            </p>
          </div>

          {/* Intensity filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {[
              { key: 'all',      label: `All (${TOTAL_POSES})` },
              { key: 'light',    label: `🟢 Light (${ALL_POSES.filter(p => p.intensity === 'light').length})` },
              { key: 'moderate', label: `🟣 Moderate (${ALL_POSES.filter(p => p.intensity === 'moderate').length})` },
              { key: 'intense',  label: `🔴 Intense (${ALL_POSES.filter(p => p.intensity === 'intense').length})` },
            ].map(f => (
              <FilterPill key={f.key} label={f.label} active={filter === f.key}
                onClick={() => setFilter(f.key)} />
            ))}
          </div>

          {/* Pose grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map(p => (
              <PoseCard key={p.slug} name={p.name} intensity={p.intensity} goals={p.goals} />
            ))}
          </div>

          {/* CTA inside section */}
          <div className="text-center mt-12">
            <button
              onClick={() => navigate('/schedule')}
              className="btn-brand-shimmer px-8 py-3.5 text-[0.95rem] font-display font-bold
                         shadow-brand-lg hover:-translate-y-0.5 transition-transform duration-200">
              Get My Personalised Plan →
            </button>
          </div>
        </div>
      </section>

      {/* ── CTA FOOTER ── */}
      <section className="relative z-10 py-28 px-6 text-center overflow-hidden bg-white">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[500px] h-[500px] rounded-full bg-surface-mid opacity-60 blur-[80px]" />
        </div>
        <h2 className="font-display text-[2.8rem] font-black text-ink mb-4 relative z-10">
          Ready to <span className="gradient-text">begin?</span>
        </h2>
        <p className="text-ink-muted text-[1rem] mb-10 relative z-10">
          Create a free account and get your personalised weekly schedule today.
        </p>
        <button
          onClick={() => navigate('/signup')}
          className="btn-brand-shimmer px-10 py-4 text-[1.05rem] font-display font-bold
                     shadow-brand-lg hover:-translate-y-1 transition-transform duration-200
                     relative z-10">
          Get Started Free →
        </button>
      </section>

    </div>
  )
}
