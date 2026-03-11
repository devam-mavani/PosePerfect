/**
 * pages/Home.jsx
 *
 * Landing page — Bear-inspired warm, editorial aesthetic.
 * Light mode, warm cream surfaces, rust accent, serif headings.
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

export default function Home() {
  const navigate = useNavigate()

  return (
    <main className="pt-20 min-h-screen">

      {/* ── Hero ── */}
      <section className="max-w-[1160px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center px-8 py-20">

        {/* Copy */}
        <div className="animate-fade-up">
          {/* Tag */}
          <span className="inline-flex items-center gap-2 bg-bear-pale border border-bear/20 rounded-full px-3.5 py-1.5 text-[0.72rem] font-semibold tracking-[0.1em] uppercase text-bear mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-bear rec-dot" />
            AI Yoga Coach
          </span>

          <h1 className="font-display text-[clamp(2.6rem,4.8vw,4.2rem)] font-bold leading-[1.1] tracking-tight text-ink mb-6">
            Perfect your<br />
            practice,<br />
            <em className="not-italic text-bear">every session.</em>
          </h1>

          <p className="text-ink-muted text-[1.05rem] leading-[1.85] font-light mb-10 max-w-[460px]">
            PosePerfect uses computer vision to analyse your yoga poses in real time —
            delivering joint-level feedback, posture scores, and instant corrections
            so you move safely and effectively.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/detection')}
              className="inline-flex items-center gap-2 bg-bear text-white rounded-lg px-7 py-3.5
                         text-[0.9rem] font-semibold tracking-wide transition-all duration-200
                         hover:bg-bear-dark shadow-bear hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]"
            >
              Start Detection →
            </button>
            <button
              onClick={() => navigate('/about')}
              className="inline-flex items-center gap-2 bg-paper-card border border-warm text-ink-muted
                         rounded-lg px-7 py-3.5 text-[0.9rem] font-medium tracking-wide transition-all duration-200
                         hover:border-bear/40 hover:text-bear hover:bg-bear-pale active:scale-[0.98]"
            >
              Learn more
            </button>
          </div>
        </div>

        {/* Hero visual — warm card stack */}
        <div className="hidden lg:flex justify-center items-center">
          <div className="relative w-[340px]">
            {/* Back card */}
            <div className="absolute -top-4 -right-4 w-full h-full bg-paper-mid border border-warm rounded-2xl rotate-3 shadow-card" />
            {/* Middle card */}
            <div className="absolute -top-2 -right-2 w-full h-full bg-paper-card border border-warm rounded-2xl rotate-1 shadow-card" />
            {/* Front card */}
            <div className="relative bg-paper-card border border-warm rounded-2xl p-8 shadow-lift">
              <p className="text-[0.65rem] font-semibold tracking-[0.12em] uppercase text-ink-faint mb-3">
                Detected Pose
              </p>
              <p className="font-display text-[2rem] font-bold text-ink mb-5">
                Warrior II
              </p>
              {/* Confidence bar */}
              <div className="mb-5">
                <div className="flex justify-between text-[0.75rem] text-ink-muted mb-1.5">
                  <span>Confidence</span>
                  <span className="font-semibold text-bear">87%</span>
                </div>
                <div className="h-1.5 bg-paper-mid rounded-full overflow-hidden">
                  <div className="h-full w-[87%] bg-bear rounded-full" />
                </div>
              </div>
              {/* Status */}
              <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
                <span className="text-status-ok text-[1rem]">✓</span>
                <span className="text-[0.82rem] font-semibold text-status-ok">Great form — keep it up!</span>
              </div>
              {/* Joint rows */}
              <div className="mt-4 flex flex-col gap-1.5">
                {[
                  { name: 'Left Shoulder',  ok: true  },
                  { name: 'Right Hip',       ok: false },
                  { name: 'Left Knee',       ok: true  },
                ].map(({ name, ok }) => (
                  <div key={name} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-paper">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${ok ? 'bg-status-ok' : 'bg-status-bad'}`} />
                    <span className="text-[0.8rem] text-ink flex-1">{name}</span>
                    <span className="text-[0.72rem] text-ink-faint italic">{ok ? 'Aligned' : 'Adjust +12°'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Poses ribbon ── */}
      <div className="border-y border-warm bg-paper-mid py-3 overflow-hidden">
        <div className="flex items-center gap-8 w-max px-8">
          {[...POSES, ...POSES].map((pose, i) => (
            <span key={i} className="text-[0.72rem] tracking-[0.12em] uppercase font-semibold text-ink-faint whitespace-nowrap flex items-center gap-3">
              {pose}
              <span className="w-1 h-1 rounded-full bg-warm inline-block" />
            </span>
          ))}
        </div>
      </div>

      {/* ── Features ── */}
      <section className="max-w-[1160px] mx-auto px-8 py-20">
        <div className="mb-12">
          <p className="text-[0.7rem] font-semibold tracking-[0.14em] uppercase text-bear mb-3">Everything you need</p>
          <h2 className="font-display text-[clamp(1.8rem,3vw,2.5rem)] font-bold text-ink">
            Built for serious practice.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon, title, desc }) => (
            <article
              key={title}
              className="bg-paper-card border border-warm rounded-xl p-6 shadow-card card-hover"
            >
              <div className="text-[1.6rem] mb-4">{icon}</div>
              <h3 className="font-display font-semibold text-[1rem] text-ink mb-2">{title}</h3>
              <p className="text-ink-muted text-[0.875rem] leading-[1.72]">{desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── CTA strip ── */}
      <section className="bg-bear mx-8 mb-16 rounded-2xl px-10 py-12 max-w-[1160px] lg:mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="font-display text-[1.6rem] font-bold text-white leading-tight mb-1">
            Ready to refine your form?
          </h2>
          <p className="text-white/70 text-[0.9rem]">Open your camera and start detecting in seconds.</p>
        </div>
        <button
          onClick={() => navigate('/detection')}
          className="shrink-0 bg-white text-bear font-semibold text-[0.9rem] tracking-wide rounded-lg px-7 py-3.5
                     transition-all duration-200 hover:bg-bear-pale hover:shadow-lg active:scale-[0.98]"
        >
          Open Detection →
        </button>
      </section>

    </main>
  )
}
