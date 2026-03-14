/**
 * pages/LiveDetection.jsx
 *
 * Live detection page with integrated voice assistant.
 *
 * Voice assistant panel includes:
 *  - Mute / unmute toggle
 *  - Male / female voice selector
 *  - Hold timer duration setter (5s – 60s)
 *  - Live hold countdown display
 */

import WebcamFeed  from '../components/WebcamFeed'
import ResultPanel from '../components/ResultPanel'
import { useWebcamDetection } from '../hooks/useWebcamDetection'
import { useSpeech } from '../hooks/useSpeech'
import { useCallback } from 'react'

// ── Hold countdown ring ───────────────────────────────────────────────────────
function HoldTimer({ countdown, total }) {
  const pct    = countdown / total
  const radius = 28
  const circ   = 2 * Math.PI * radius
  const dash   = circ * pct

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20 flex items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" width="80" height="80">
          <circle cx="40" cy="40" r={radius} fill="none" stroke="#E2DEFF" strokeWidth="5" />
          <circle
            cx="40" cy="40" r={radius}
            fill="none"
            stroke="#7C6FCD"
            strokeWidth="5"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s ease' }}
          />
        </svg>
        <span className="font-display font-extrabold text-[1.6rem] text-lavender z-10">
          {countdown}
        </span>
      </div>
      <p className="text-[0.75rem] font-semibold text-lavender tracking-wide uppercase">
        Hold it!
      </p>
    </div>
  )
}

// ── Voice assistant control panel ─────────────────────────────────────────────
function VoicePanel({
  isMuted, onToggleMute,
  gender, onGenderChange,
  holdDuration, onHoldDurationChange,
  holdCountdown, isHolding,
}) {
  return (
    <div className="bg-white border border-edge rounded-2xl shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-edge bg-surface">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-lavender-pale flex items-center justify-center">
            <span className="text-[0.85rem]">🎙️</span>
          </div>
          <span className="font-display font-bold text-[0.92rem] text-ink">Voice Assistant</span>
        </div>
        {/* Mute toggle */}
        <button
          onClick={onToggleMute}
          className={[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.78rem] font-semibold transition-all duration-200',
            isMuted
              ? 'bg-surface-mid border border-edge text-ink-faint'
              : 'bg-lavender text-white shadow-lavender',
          ].join(' ')}
        >
          {isMuted ? '🔇 Muted' : '🔊 On'}
        </button>
      </div>

      <div className="p-5 flex flex-col gap-5">

        {/* Hold countdown — shown when holding */}
        {isHolding && holdCountdown !== null && (
          <div className="flex justify-center py-2">
            <HoldTimer countdown={holdCountdown} total={holdDuration} />
          </div>
        )}

        {/* Voice gender */}
        <div>
          <p className="text-[0.72rem] font-semibold tracking-[0.1em] uppercase text-ink-faint mb-2.5">
            Voice
          </p>
          <div className="grid grid-cols-2 gap-2">
            {['female', 'male'].map((g) => (
              <button
                key={g}
                onClick={() => onGenderChange(g)}
                disabled={isMuted}
                className={[
                  'py-2.5 rounded-xl text-[0.83rem] font-semibold border transition-all duration-200 capitalize',
                  gender === g
                    ? 'bg-lavender text-white border-lavender shadow-lavender'
                    : 'bg-surface border-edge text-ink-muted hover:border-lavender-soft hover:text-lavender',
                  isMuted ? 'opacity-40 cursor-not-allowed' : '',
                ].join(' ')}
              >
                {g === 'female' ? '👩 Female' : '👨 Male'}
              </button>
            ))}
          </div>
        </div>

        {/* Hold timer duration */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[0.72rem] font-semibold tracking-[0.1em] uppercase text-ink-faint">
              Hold Timer
            </p>
            <span className="font-display font-bold text-lavender text-[0.95rem]">
              {holdDuration}s
            </span>
          </div>
          <input
            type="range"
            min="5"
            max="60"
            step="5"
            value={holdDuration}
            onChange={(e) => onHoldDurationChange(Number(e.target.value))}
            disabled={isHolding}
            className="w-full h-2 appearance-none rounded-full cursor-pointer disabled:opacity-40
                       disabled:cursor-not-allowed"
            style={{
              background: `linear-gradient(to right, #7C6FCD ${((holdDuration - 5) / 55) * 100}%, #E2DEFF ${((holdDuration - 5) / 55) * 100}%)`,
            }}
          />
          <div className="flex justify-between text-[0.68rem] text-ink-faint mt-1">
            <span>5s</span>
            <span>60s</span>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-lavender-pale border border-lavender-soft rounded-xl px-4 py-3">
          <p className="text-[0.72rem] font-semibold text-lavender mb-1.5">How it works</p>
          <ul className="text-[0.72rem] text-ink-muted leading-[1.8] list-none space-y-0.5">
            <li>① Announces detected pose name</li>
            <li>② Guides worst joint correction first</li>
            <li>③ Works through remaining corrections</li>
            <li>④ Starts hold timer when form is perfect</li>
          </ul>
        </div>

      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LiveDetection() {
  const {
    isMuted, toggleMute,
    gender, setGender,
    holdDuration, setHoldDuration,
    holdCountdown, isHolding,
    onNewResult,
  } = useSpeech()

  // Pass onNewResult into the detection hook so speech fires on every result
  const onResult = useCallback((prediction) => {
    onNewResult(prediction)
  }, [onNewResult])

  const {
    videoRef,
    isStreaming,
    isCapturing,
    loading,
    result,
    error,
    startCamera,
    stopCamera,
  } = useWebcamDetection({ onResult })

  return (
    <main className="pt-20 min-h-screen">
      <div className="max-w-[1380px] mx-auto px-8 py-10">

        {/* Page header */}
        <div className="mb-8 pb-7 border-b border-edge">
          <span className="inline-block bg-lavender-pale border border-lavender-soft rounded-full
                           px-3.5 py-1 text-[0.68rem] font-semibold tracking-[0.1em] uppercase text-lavender mb-3">
            Real-Time Analysis
          </span>
          <h1 className="font-display text-[1.9rem] font-extrabold tracking-tight text-ink mb-2">
            Live Pose Detection
          </h1>
          <p className="text-ink-muted text-[0.88rem] max-w-[520px] leading-[1.72]">
            Position yourself in frame and hold a yoga pose.
            PosePerfect analyses your form every 1.5 s — adjust in real time.
          </p>
        </div>

        {/* Three-column layout: webcam | results | voice */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.85fr_0.65fr] gap-6">

          {/* Left — webcam */}
          <section className="flex flex-col gap-4">
            <WebcamFeed
              videoRef={videoRef}
              isStreaming={isStreaming}
              isCapturing={isCapturing}
              onStart={startCamera}
              onStop={stopCamera}
            />
            {error ? (
              <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50
                              text-[0.83rem] text-status-bad">
                {error}
              </div>
            ) : (
              <p className="text-[0.76rem] text-ink-faint leading-relaxed">
                Frames sent to{' '}
                <code className="bg-lavender-pale border border-lavender-soft px-1.5 py-0.5
                                 rounded text-lavender text-[0.74rem]">
                  {import.meta.env.VITE_API_URL || 'http://localhost:8000'}/predict
                </code>
              </p>
            )}
          </section>

          {/* Middle — results */}
          <section>
            <ResultPanel result={result} loading={loading} />
          </section>

          {/* Right — voice assistant */}
          <section>
            <VoicePanel
              isMuted={isMuted}
              onToggleMute={toggleMute}
              gender={gender}
              onGenderChange={setGender}
              holdDuration={holdDuration}
              onHoldDurationChange={setHoldDuration}
              holdCountdown={holdCountdown}
              isHolding={isHolding}
            />
          </section>

        </div>
      </div>
    </main>
  )
}
