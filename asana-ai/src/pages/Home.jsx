/**
 * pages/Home.jsx — Grey & White redesign
 */

import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'

const FEATURES = [
  {
    icon: '🎯',
    title: 'Real-Time Detection',
    desc: 'CNN model analyses your webcam every 3 seconds and identifies your pose with high accuracy.',
  },
  {
    icon: '🗣️',
    title: 'Voice Guidance',
    desc: 'Natural language corrections spoken aloud — "lift your left arm slightly upwards" — every 3 seconds.',
  },
  {
    icon: '📅',
    title: 'Smart Scheduling',
    desc: 'Personalised weekly plan based on your goal, fitness level, and available practice time.',
  },
  {
    icon: '📸',
    title: 'Auto Snapshot',
    desc: 'Captures a photo automatically when your accuracy crosses 85% — perfect form preserved.',
  },
  {
    icon: '📊',
    title: 'Progress Tracking',
    desc: 'Streak calendar, mastery badges, and session history all stored in your profile.',
  },
  {
    icon: '📬',
    title: 'Weekly Reports',
    desc: 'Every weekend get an email summary of your streak, accuracy, and top poses.',
  },
]

const POSES = [
  'Downward Dog',
  'Goddess Pose',
  'Plank',
  'Tree Pose',
  'Warrior II',
  
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

export default function Home() {
  const navigate = useNavigate()

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
              { value: 5,  suffix: '',  label: 'Yoga Poses' },
              { value: 85, suffix: '%', label: 'Snapshot Accuracy' },
              { value: 3,  suffix: 's', label: 'Detection Interval' },
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

      {/* ── POSES ── */}
      <section className="relative z-10 py-20 px-6 bg-surface-mid">
        <div className="max-w-[900px] mx-auto text-center">
          <span className="text-brand text-[0.72rem] font-semibold tracking-[0.15em]
                           uppercase block mb-3">Model Trained On</span>
          <h2 className="font-display text-[2rem] font-black text-ink mb-10">
            6 Yoga Asanas
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {POSES.map((pose, i) => (
              <span key={i}
                className="bg-white border border-edge text-ink-muted
                           text-[0.85rem] font-semibold px-5 py-2.5 rounded-full
                           hover:bg-brand hover:text-white hover:border-brand
                           transition-all duration-200 cursor-default shadow-card">
                {pose}
              </span>
            ))}
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
