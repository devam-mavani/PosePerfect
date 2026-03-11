/**
 * pages/Home.jsx
 *
 * Lavender + white landing page.
 * Clean, airy, modern — soft lavender gradients with white cards.
 */

import { useNavigate } from 'react-router-dom'

const FEATURES = [
  {
    icon:  '📸',
    title: 'Real-Time Detection',
    desc:  'Pose classification every 1.5 s from your webcam — instant, uninterrupted feedback.',
  },
  {
    icon:  '🦴',
    title: 'Joint Analysis',
    desc:  'Twelve key body joints tracked individually to pinpoint exactly what\'s misaligned.',
  },
  {
    icon:  '📊',
    title: 'Confidence Scoring',
    desc:  'See how certain the model is so you know when to trust — and when to move — the feedback.',
  },
  {
    icon:  '✅',
    title: 'Instant Corrections',
    desc:  'Clear indicators tell you exactly what to fix without interrupting your flow.',
  },
  {
    icon:  '⚡',
    title: 'Low Latency',
    desc:  'Frames dispatched at smooth intervals keep the experience completely fluid.',
  },
  {
    icon:  '🔒',
    title: 'Privacy First',
    desc:  'Video never leaves your device except to your own locally-running backend.',
  },
]

const POSES = ['Downward Dog', 'Goddess Pose', 'Plank', 'Tree Pose', 'Warrior II']

const STEPS = [
  { num: '01', title: 'Open your camera',   desc: 'Allow webcam access and position yourself in frame.' },
  { num: '02', title: 'Hold a pose',        desc: 'Take any of the 5 supported yoga poses.' },
  { num: '03', title: 'Get feedback',       desc: 'Receive joint-level corrections in real time.' },
]

export default function Home() {
  const navigate = useNavigate()

  return (
    <main className="pt-20 min-h-screen overflow-x-hidden">

      {/* ── Hero ── */}
      <section className="max-w-[1160px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center px-8 py-20">

        {/* Copy */}
        <div className="animate-fade-up">
          {/* Badge */}
          <span className="inline-flex items-center gap-2 bg-lavender-pale border border-lavender-soft
                           rounded-full px-4 py-1.5 text-[0.72rem] font-semibold tracking-[0.1em]
                           uppercase text-lavender mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-lavender rec-dot" />
            AI Yoga Coach
          </span>

          <h1 className="font-display text-[clamp(2.6rem,4.8vw,4.2rem)] font-extrabold leading-[1.1]
                         tracking-tight text-ink mb-6">
            Perfect your<br />
            practice,<br />
            <span className="gradient-text">every session.</span>
          </h1>

          <p className="text-ink-muted text-[1.05rem] leading-[1.85] font-light mb-10 max-w-[460px]">
            PosePerfect uses computer vision to analyse your yoga poses in real time —
            delivering joint-level feedback, posture scores, and instant corrections
            so you move safely and effectively.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/detection')}
              className="inline-flex items-center gap-2 bg-lavender text-white rounded-xl px-7 py-3.5
                         text-[0.9rem] font-semibold tracking-wide transition-all duration-200
                         shadow-lavender hover:bg-lavender-dark hover:shadow-lift
                         hover:-translate-y-0.5 active:scale-[0.98]"
            >
              Start Detection →
            </button>
            <button
              onClick={() => navigate('/about')}
              className="inline-flex items-center gap-2 bg-white border border-edge text-ink-muted
                         rounded-xl px-7 py-3.5 text-[0.9rem] font-medium tracking-wide transition-all
                         duration-200 hover:border-lavender-soft hover:text-lavender hover:bg-lavender-pale
                         active:scale-[0.98] shadow-card"
            >
              Learn more
            </button>
          </div>
        </div>

        {/* Hero visual — floating preview card */}
        <div className="hidden lg:flex justify-center items-center">
          <div className="relative">
            {/* Glow blob behind card */}
            <div className="absolute inset-0 bg-lavender/20 rounded-3xl blur-3xl scale-110" />

            {/* Main card */}
            <div className="relative bg-white border border-edge rounded-3xl p-8 shadow-lift w-[340px] animate-float">
              <p className="text-[0.64rem] font-semibold tracking-[0.13em] uppercase text-ink-faint mb-3">
                Detected Pose
              </p>
              <p className="font-display text-[2rem] font-extrabold text-ink mb-5">
                Warrior II
              </p>

              {/* Confidence */}
              <div className="mb-5">
                <div className="flex justify-between text-[0.75rem] mb-1.5">
                  <span className="text-ink-muted">Confidence</span>
                  <span className="font-bold text-lavender">87%</span>
                </div>
                <div className="h-2 bg-surface-mid rounded-full overflow-hidden">
                  <div className="h-full w-[87%] bg-gradient-to-r from-lavender-dark to-lavender-light rounded-full" />
                </div>
              </div>

              {/* Status chip */}
              <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 mb-4">
                <span className="text-status-ok font-bold">✓</span>
                <span className="text-[0.82rem] font-semibold text-status-ok">Great form — keep it up!</span>
              </div>

              {/* Joint rows */}
              {[
                { name: 'Left Shoulder',  ok: true  },
                { name: 'Right Hip',      ok: false },
                { name: 'Left Knee',      ok: true  },
              ].map(({ name, ok }) => (
                <div key={name} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-surface mb-1.5 border border-edge/60">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${ok ? 'bg-status-ok' : 'bg-status-bad'}`} />
                  <span className="text-[0.8rem] text-ink flex-1">{name}</span>
                  <span className="text-[0.72rem] text-ink-faint italic">{ok ? 'Aligned' : 'Adjust +12°'}</span>
                </div>
              ))}
            </div>

            {/* Floating badge */}
            <div className="absolute -top-4 -right-6 bg-lavender text-white text-[0.7rem] font-bold
                            tracking-wide px-3 py-1.5 rounded-full shadow-lavender">
              Live ●
            </div>
          </div>
        </div>
      </section>

      {/* ── Poses ribbon ── */}
      <div className="bg-lavender-pale border-y border-lavender-soft py-3.5 overflow-hidden">
        <div className="flex items-center gap-8 w-max px-8">
          {[...POSES, ...POSES].map((pose, i) => (
            <span key={i} className="text-[0.72rem] tracking-[0.12em] uppercase font-semibold text-lavender whitespace-nowrap flex items-center gap-3">
              {pose}
              <span className="w-1.5 h-1.5 rounded-full bg-lavender-light inline-block" />
            </span>
          ))}
        </div>
      </div>

      {/* ── How it works ── */}
      <section className="max-w-[1160px] mx-auto px-8 py-20">
        <div className="text-center mb-14">
          <p className="text-[0.7rem] font-semibold tracking-[0.14em] uppercase text-lavender mb-3">
            Simple as 1, 2, 3
          </p>
          <h2 className="font-display text-[clamp(1.8rem,3vw,2.4rem)] font-extrabold text-ink">
            How it works
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {STEPS.map(({ num, title, desc }) => (
            <div key={num} className="relative bg-white border border-edge rounded-2xl p-8 shadow-card card-hover text-center">
              <div className="w-12 h-12 rounded-2xl bg-lavender-pale border border-lavender-soft flex items-center
                              justify-center mx-auto mb-5">
                <span className="font-display font-extrabold text-lavender text-[0.95rem]">{num}</span>
              </div>
              <h3 className="font-display font-bold text-[1rem] text-ink mb-2">{title}</h3>
              <p className="text-ink-muted text-[0.875rem] leading-[1.72]">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="bg-surface-mid border-y border-edge py-20">
        <div className="max-w-[1160px] mx-auto px-8">
          <div className="mb-12">
            <p className="text-[0.7rem] font-semibold tracking-[0.14em] uppercase text-lavender mb-3">
              Everything you need
            </p>
            <h2 className="font-display text-[clamp(1.8rem,3vw,2.4rem)] font-extrabold text-ink">
              Built for serious practice.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon, title, desc }) => (
              <article
                key={title}
                className="bg-white border border-edge rounded-2xl p-6 shadow-card card-hover"
              >
                <div className="w-11 h-11 rounded-xl bg-lavender-pale flex items-center justify-center mb-4 text-[1.2rem]">
                  {icon}
                </div>
                <h3 className="font-display font-bold text-[1rem] text-ink mb-2">{title}</h3>
                <p className="text-ink-muted text-[0.875rem] leading-[1.72]">{desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-[1160px] mx-auto px-8 py-20">
        <div className="bg-gradient-to-br from-lavender to-lavender-dark rounded-3xl px-12 py-14
                        flex flex-col sm:flex-row items-center justify-between gap-8 shadow-lift">
          <div>
            <h2 className="font-display text-[1.8rem] font-extrabold text-white leading-tight mb-2">
              Ready to refine your form?
            </h2>
            <p className="text-white/70 text-[0.9rem]">
              Open your camera and start detecting in seconds.
            </p>
          </div>
          <button
            onClick={() => navigate('/detection')}
            className="shrink-0 bg-white text-lavender font-bold text-[0.9rem] tracking-wide
                       rounded-xl px-8 py-3.5 transition-all duration-200
                       hover:bg-lavender-pale hover:shadow-lg active:scale-[0.98]"
          >
            Open Detection →
          </button>
        </div>
      </section>

    </main>
  )
}
