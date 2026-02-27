/**
 * pages/Home.jsx
 *
 * Landing page — hero section + feature cards.
 */

import { useNavigate } from 'react-router-dom'

const FEATURES = [
  {
    icon:  '🧘',
    title: 'Real-Time Detection',
    desc:  'Pose classification every 1.5 s using your webcam feed — zero noticeable lag.',
  },
  {
    icon:  '🦴',
    title: 'Joint Analysis',
    desc:  'Body landmarks tracked individually to pinpoint which joints are out of alignment.',
  },
  {
    icon:  '📊',
    title: 'Confidence Scoring',
    desc:  "See how certain the model is so you know when to trust — and when to move — the feedback.",
  },
  {
    icon:  '🟢',
    title: 'Instant Corrections',
    desc:  'Green / red indicators tell you exactly what to fix without interrupting your flow.',
  },
  {
    icon:  '⚡',
    title: 'Low Latency',
    desc:  'Frames are captured and dispatched at smooth intervals, keeping the experience fluid.',
  },
  {
    icon:  '🔒',
    title: 'Privacy First',
    desc:  'Video never leaves your device except to your own locally-running backend API.',
  },
]

export default function Home() {
  const navigate = useNavigate()

  return (
    <main className="pt-20 min-h-screen">
      {/* ── Hero ── */}
      <section className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center px-8 py-20">
        {/* Copy */}
        <div className="animate-fade-up">
          {/* Badge */}
          <span className="inline-flex items-center gap-2 bg-sage/10 border border-sage/25 rounded-full px-3.5 py-1.5 text-[0.7rem] font-semibold tracking-widest uppercase text-sage-light mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-sage animate-pulse" />
            AI-Powered Yoga Coach
          </span>

          <h1 className="font-display text-[clamp(2.8rem,5vw,4.5rem)] font-extrabold leading-[1.05] tracking-tight mb-6">
            Perfect Your<br />
            <span className="text-sage">Asana</span><br />
            Every Session
          </h1>

          <p className="text-muted text-[1.05rem] leading-[1.8] font-light mb-10 max-w-[480px]">
            AsanaAI uses computer vision to analyse your yoga poses in real time —
            giving you joint-level feedback, posture scores, and instant corrections
            so you practice safely and effectively.
          </p>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => navigate('/detection')}
              className="inline-flex items-center gap-2 bg-sage text-charcoal rounded-full px-7 py-3.5
                         text-[0.9rem] font-semibold tracking-wide transition-all duration-200
                         hover:bg-sage-light hover:shadow-xl hover:shadow-sage/25 hover:-translate-y-0.5 active:scale-[0.98]"
            >
              ▶ Start Detection
            </button>
            <button
              onClick={() => navigate('/about')}
              className="inline-flex items-center gap-2 bg-transparent border border-sage/35 text-sage-light
                         rounded-full px-7 py-3.5 text-[0.9rem] font-medium tracking-wide transition-all duration-200
                         hover:bg-sage/8 hover:border-sage active:scale-[0.98]"
            >
              Learn More
            </button>
          </div>
        </div>

        {/* Visual orb — hidden on smaller screens */}
        <div className="hidden lg:flex justify-center items-center">
          <div
            className="orbit-ring relative w-[380px] h-[380px] rounded-full flex items-center justify-center
                       bg-[radial-gradient(circle_at_30%_30%,rgba(107,158,120,0.15),rgba(107,158,120,0.02))]
                       border border-sage/15"
          >
            <span className="text-[7rem] select-none">🧘‍♀️</span>
          </div>
        </div>
      </section>

      {/* ── Features grid ── */}
      <section className="max-w-[1200px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 px-8 pb-24">
        {FEATURES.map(({ icon, title, desc }) => (
          <article
            key={title}
            className="bg-charcoal-mid border border-sage/8 rounded-2xl p-7
                       transition-all duration-200 hover:border-sage/30 hover:-translate-y-0.5"
          >
            <div className="text-[2rem] mb-4">{icon}</div>
            <h3 className="font-display font-bold text-[1.02rem] mb-2">{title}</h3>
            <p className="text-muted text-[0.875rem] leading-[1.7]">{desc}</p>
          </article>
        ))}
      </section>
    </main>
  )
}
