/**
 * pages/About.jsx
 *
 * Bear-inspired — editorial layout, warm surfaces, serif section headers.
 */

import { SUPPORTED_POSES, TECH_STACK, TEAM } from '../constants'

function Section({ title, children }) {
  return (
    <section className="mb-12 pb-12 border-b border-warm last:border-0 last:mb-0 last:pb-0">
      <h2 className="font-display text-[1.1rem] font-semibold text-bear mb-5">{title}</h2>
      {children}
    </section>
  )
}

export default function About() {
  return (
    <main className="pt-20 min-h-screen">
      <div className="max-w-[820px] mx-auto px-8 py-14 pb-24">

        {/* Header */}
        <span className="inline-block bg-bear-pale border border-bear/20 rounded-full px-3.5 py-1.5 text-[0.7rem] font-semibold tracking-[0.1em] uppercase text-bear mb-6">
          About the Project
        </span>

        <h1 className="font-display text-[clamp(2.2rem,4vw,3rem)] font-bold tracking-tight leading-[1.15] text-ink mb-5">
          Built for mindful<br />
          <em className="not-italic text-bear">movement.</em>
        </h1>

        <p className="text-ink-muted text-[1.05rem] font-light leading-[1.85] mb-14 max-w-[600px]">
          PosePerfect bridges the gap between traditional yoga practice and modern
          computer vision. Our mission is to make expert-level posture feedback
          accessible to everyone — no instructor required.
        </p>

        {/* ── How it works ── */}
        <Section title="How It Works">
          <p className="text-ink-muted text-[0.93rem] leading-[1.82]">
            Your webcam feed is captured entirely client-side. A JPEG frame is extracted
            every 1.5 seconds and forwarded to a FastAPI backend running MediaPipe Pose
            for landmark extraction, plus a trained SVM classifier for pose recognition.
            The backend returns the predicted pose name, a posture verdict, a confidence
            score, and per-joint correction feedback — all rendered instantly in the
            browser with zero page reloads.
          </p>
        </Section>

        {/* ── API contract ── */}
        <Section title="API Contract">
          <p className="text-ink-muted text-[0.88rem] mb-4 leading-[1.78]">
            The frontend posts a{' '}
            <code className="bg-paper-mid border border-warm px-1.5 py-0.5 rounded text-bear text-[0.82rem]">
              multipart/form-data
            </code>{' '}
            frame to{' '}
            <code className="bg-paper-mid border border-warm px-1.5 py-0.5 rounded text-bear text-[0.82rem]">
              POST /predict
            </code>
            . Your backend should return JSON in this shape:
          </p>
          <pre className="bg-paper-card border border-warm rounded-xl p-6 text-[0.78rem] text-bear overflow-x-auto leading-[1.78] shadow-card font-mono">
{`{
  "pose":           "Warrior II",
  "confidence":     0.94,
  "posture_status": "correct",
  "joints": [
    { "name": "Left Shoulder",  "status": "ok",  "feedback": "Aligned" },
    { "name": "Right Hip",      "status": "fix", "feedback": "Rotate outward" }
  ]
}`}
          </pre>
        </Section>

        {/* ── Supported poses ── */}
        <Section title="Supported Poses">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {SUPPORTED_POSES.map((pose) => (
              <div
                key={pose}
                className="flex items-center gap-3 bg-paper-card border border-warm rounded-lg px-4 py-3 shadow-card"
              >
                <span className="w-2 h-2 rounded-full bg-bear shrink-0" />
                <span className="text-[0.875rem] font-medium text-ink">{pose}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Tech stack ── */}
        <Section title="Technology Stack">
          <div className="flex flex-wrap gap-2.5">
            {TECH_STACK.map((tech) => (
              <span
                key={tech}
                className="bg-bear-pale border border-bear/20 rounded-full px-4 py-1.5 text-[0.8rem] font-semibold text-bear"
              >
                {tech}
              </span>
            ))}
          </div>
        </Section>

        {/* ── Architecture ── */}
        <Section title="Project Architecture">
          <pre className="bg-paper-card border border-warm rounded-xl p-6 text-[0.78rem] text-ink-muted overflow-x-auto leading-[1.85] shadow-card font-mono">
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
│   └── useWebcamDetection.js
├── services/
│   └── api.js
├── constants/
│   └── index.js
└── styles/
    └── index.css`}
          </pre>
        </Section>

        {/* ── Team ── */}
        <Section title="Team">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {TEAM.map(({ avatar, name, role }) => (
              <div
                key={name}
                className="bg-paper-card border border-warm rounded-xl p-6 text-center shadow-card card-hover"
              >
                <div className="text-[2.5rem] mb-3">{avatar}</div>
                <p className="font-display font-semibold text-[0.95rem] text-ink">{name}</p>
                <p className="text-ink-muted text-[0.78rem] mt-1">{role}</p>
              </div>
            ))}
          </div>
        </Section>

      </div>
    </main>
  )
}
