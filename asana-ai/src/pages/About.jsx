/**
 * pages/About.jsx
 *
 * Project overview, API contract, tech stack, and team.
 */

import { SUPPORTED_POSES, TECH_STACK, TEAM } from '../constants'

function Section({ title, children }) {
  return (
    <section className="mb-12">
      <h2 className="font-display text-[1.15rem] font-bold text-sage-light mb-4">{title}</h2>
      {children}
    </section>
  )
}

export default function About() {
  return (
    <main className="pt-20 min-h-screen">
      <div className="max-w-[860px] mx-auto px-8 py-12 pb-24">
        {/* Header */}
        <span className="inline-block bg-sage/8 border border-sage/20 rounded-full px-3.5 py-1.5 text-[0.7rem] font-semibold tracking-widest uppercase text-sage-light mb-5">
          About the Project
        </span>

        <h1 className="font-display text-[clamp(2.2rem,4vw,3rem)] font-extrabold tracking-tight leading-tight mb-5">
          Built for Mindful<br />Movement
        </h1>

        <p className="text-muted text-[1.05rem] font-light leading-[1.82] mb-14 max-w-[620px]">
          AsanaAI bridges the gap between traditional yoga practice and modern computer
          vision. Our mission is to make expert-level posture feedback accessible to
          everyone — no instructor required.
        </p>

        {/* ── How it works ── */}
        <Section title="How It Works">
          <p className="text-muted text-[0.93rem] leading-[1.8]">
            Your webcam feed is captured entirely client-side. A JPEG frame is extracted
            every 1.5 seconds and forwarded to a FastAPI backend running MediaPipe or a
            custom pose classification model. The backend returns the predicted pose name,
            a posture verdict, a confidence score, and per-joint correction feedback — all
            rendered in real time in the browser with zero page reloads.
          </p>
        </Section>

        {/* ── API contract ── */}
        <Section title="API Contract">
          <p className="text-muted text-[0.88rem] mb-4 leading-[1.75]">
            The frontend posts a{' '}
            <code className="bg-white/5 px-1.5 py-0.5 rounded text-sage-light text-[0.82rem]">
              multipart/form-data
            </code>{' '}
            frame to{' '}
            <code className="bg-white/5 px-1.5 py-0.5 rounded text-sage-light text-[0.82rem]">
              POST /predict
            </code>
            . Your backend should return JSON in this exact shape:
          </p>
          <pre className="bg-charcoal-mid border border-sage/12 rounded-2xl p-6 text-[0.78rem] text-sage-light overflow-x-auto leading-[1.75]">
{`{
  "pose":           "Warrior II",
  "confidence":     0.94,
  "posture_status": "correct",      // "correct" | "wrong"
  "joints": [
    { "name": "Left Shoulder",  "status": "ok",  "feedback": "Aligned" },
    { "name": "Right Hip",      "status": "fix", "feedback": "Rotate outward" }
  ]
}`}
          </pre>
        </Section>

        {/* ── Supported poses ── */}
        <Section title="Supported Poses">
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SUPPORTED_POSES.map((pose) => (
              <li
                key={pose}
                className="flex items-start gap-2 text-muted text-[0.875rem] leading-[1.65]"
              >
                <span className="text-sage font-medium mt-0.5">→</span>
                {pose}
              </li>
            ))}
          </ul>
        </Section>

        {/* ── Tech stack ── */}
        <Section title="Technology Stack">
          <div className="flex flex-wrap gap-2.5">
            {TECH_STACK.map((tech) => (
              <span
                key={tech}
                className="bg-charcoal-mid border border-sage/18 rounded-full px-4 py-1.5 text-[0.8rem] font-medium text-sage-light"
              >
                {tech}
              </span>
            ))}
          </div>
        </Section>

        {/* ── Architecture ── */}
        <Section title="Project Architecture">
          <pre className="bg-charcoal-mid border border-sage/12 rounded-2xl p-6 text-[0.78rem] text-sage-light overflow-x-auto leading-[1.8]">
{`src/
├── components/
│   ├── Navbar.jsx          # Fixed top navigation
│   ├── WebcamFeed.jsx      # Camera UI & controls
│   ├── ResultPanel.jsx     # Prediction result cards
│   └── LoadingSpinner.jsx  # Shared spinner
├── pages/
│   ├── Home.jsx            # Landing page
│   ├── LiveDetection.jsx   # Detection view
│   └── About.jsx           # This page
├── hooks/
│   └── useWebcamDetection.js  # Camera + prediction loop
├── services/
│   └── api.js              # Axios client & API calls
├── constants/
│   └── index.js            # Poses, team, config
└── styles/
    └── index.css           # Tailwind base + CSS vars`}
          </pre>
        </Section>

        {/* ── Team ── */}
        <Section title="Team">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {TEAM.map(({ avatar, name, role }) => (
              <div
                key={name}
                className="bg-charcoal-mid border border-sage/10 rounded-2xl p-6 text-center
                           transition-all duration-200 hover:border-sage/28"
              >
                <div className="text-[2.5rem] mb-3">{avatar}</div>
                <p className="font-display font-bold text-[0.95rem]">{name}</p>
                <p className="text-muted text-[0.78rem] mt-1">{role}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </main>
  )
}
