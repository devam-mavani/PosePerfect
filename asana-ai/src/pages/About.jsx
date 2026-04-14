/**
 * pages/About.jsx — grey/white theme (lavender classes removed)
 */

import { SUPPORTED_POSES, TECH_STACK } from "../constants";

function Section({ title, children }) {
  return (
    <section className="mb-10">
      <div className="flex items-center gap-3 mb-5">
        {/* accent bar: charcoal instead of lavender */}
        <span className="w-1 h-5 rounded-full bg-brand inline-block shrink-0" />
        <h2 className="font-display text-[1.1rem] font-bold text-ink">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

export default function About() {
  return (
    <main className="pt-20 min-h-screen bg-white">
      <div className="max-w-[820px] mx-auto px-8 py-14 pb-24">

        {/* Header badge */}
        <span className="inline-block bg-brand-pale border border-brand-soft
                         rounded-full px-3.5 py-1.5 text-[0.7rem] font-semibold
                         tracking-[0.1em] uppercase text-brand mb-6">
          About the Project
        </span>

        <h1 className="font-display text-[clamp(2.2rem,4vw,3rem)] font-extrabold
                        tracking-tight leading-[1.15] text-ink mb-5">
          Built for mindful
          <br />
          <span className="gradient-text">movement.</span>
        </h1>

        <p className="text-ink-muted text-[1.05rem] font-light leading-[1.85]
                       mb-14 max-w-[600px]">
          PosePerfect bridges the gap between traditional yoga practice and
          modern computer vision. Our mission is to make expert-level posture
          feedback accessible to everyone — no instructor required.
        </p>

        {/* How it works */}
        <Section title="How It Works">
          <div className="bg-surface border border-edge rounded-2xl p-6 shadow-card">
            <p className="text-ink-muted text-[0.93rem] leading-[1.82]">
              Your webcam feed is captured client-side. A frame is sent to a FastAPI backend,
              processed using MediaPipe + ML model, and results are returned instantly.
            </p>
          </div>
        </Section>

        {/* API */}
        <Section title="API Contract">
          <p className="text-ink-muted text-[0.88rem] mb-4 leading-[1.78]">
            POST request to{' '}
            <code className="bg-brand-pale border border-brand-soft px-1.5 py-0.5
                             rounded text-brand text-[0.82rem]">
              /predict
            </code>
          </p>

          <pre className="bg-surface-mid border border-edge rounded-2xl p-6
                          text-[0.78rem] text-ink overflow-x-auto shadow-card font-mono">
{`{
  "pose": "Warrior II",
  "confidence": 0.94,
  "posture_status": "correct"
}`}
          </pre>
        </Section>

        {/* Supported Poses */}
        <Section title="Supported Poses">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {SUPPORTED_POSES?.map((pose, index) => (
              <div
                key={index}
                className="flex items-center gap-3 bg-surface border border-edge
                           rounded-xl px-4 py-3 shadow-card"
              >
                {/* dot: charcoal */}
                <span className="w-2.5 h-2.5 rounded-full bg-brand shrink-0" />
                <span className="text-[0.875rem] font-medium text-ink">
                  {pose}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* Tech Stack */}
        <Section title="Technology Stack">
          <div className="flex flex-wrap gap-2.5">
            {TECH_STACK?.map((tech, index) => (
              <span
                key={index}
                className="bg-brand-pale border border-brand-soft rounded-full
                           px-4 py-1.5 text-[0.8rem] font-semibold text-brand"
              >
                {tech}
              </span>
            ))}
          </div>
        </Section>

      </div>
    </main>
  );
}
