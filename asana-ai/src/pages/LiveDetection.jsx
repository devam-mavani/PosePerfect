/**
 * pages/LiveDetection.jsx
 *
 * Live detection page wiring together:
 *  - useWebcamDetection  (camera + predictions)
 *  - useSpeech           (voice assistant)
 *  - useSessionStats     (streak, mastery, session tracking)
 *  - useSnapshot         (3s hold → auto download to dataset/)
 *
 * Added: Detection Speed toggle — 3s (Normal) or 5s (Beginner)
 */

import { useCallback, useState, useEffect, useRef } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../contexts/AuthContext'

import WebcamFeed    from '../components/WebcamFeed'
import ResultPanel   from '../components/ResultPanel'
import YogaCard      from '../components/YogaCard'
import BadgeDisplay  from '../components/BadgeDisplay'

import { useWebcamDetection } from '../hooks/useWebcamDetection'
import { useSpeech }          from '../hooks/useSpeech'
import { useSessionStats }    from '../hooks/useSessionStats'
import { useSnapshot }        from '../hooks/useSnapshot'

// ── Detection speed options ───────────────────────────────────────────────────
const SPEED_OPTIONS = [
  {
    label:    'Normal',
    ms:       3000,
    icon:     '⚡',
    desc:     '3s — for intermediate practitioners',
  },
  {
    label:    'Beginner',
    ms:       5000,
    icon:     '🌱',
    desc:     '5s — more time to adjust and listen',
  },
]

// ── Hold countdown ring ───────────────────────────────────────────────────────
function HoldTimer({ countdown, total }) {
  const radius = 28
  const circ   = 2 * Math.PI * radius
  const dash   = circ * (countdown / total)

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20 flex items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" width="80" height="80">
          <circle cx="40" cy="40" r={radius} fill="none" stroke="#E2DEFF" strokeWidth="5" />
          <circle cx="40" cy="40" r={radius} fill="none" stroke="#7C6FCD" strokeWidth="5"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        </svg>
        <span className="font-display font-extrabold text-[1.6rem] text-lavender z-10">
          {countdown}
        </span>
      </div>
      <p className="text-[0.75rem] font-semibold text-lavender tracking-wide uppercase">Hold it!</p>
    </div>
  )
}

// ── Voice assistant + speed panel ─────────────────────────────────────────────
function VoicePanel({
  isMuted, onToggleMute,
  gender, onGenderChange,
  holdDuration, onHoldDurationChange,
  holdCountdown, isHolding,
  captureInterval, onIntervalChange,
  isStreaming,
}) {
  return (
    <div className="bg-white border border-edge rounded-2xl shadow-card overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-edge bg-surface">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-lavender-pale flex items-center justify-center">
            <span className="text-[0.85rem]">🎙️</span>
          </div>
          <span className="font-display font-bold text-[0.92rem] text-ink">Assistant</span>
        </div>
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

        {/* Hold countdown */}
        {isHolding && holdCountdown !== null && (
          <div className="flex justify-center py-2">
            <HoldTimer countdown={holdCountdown} total={holdDuration} />
          </div>
        )}

        {/* ── Detection Speed ── */}
        <div>
          <p className="text-[0.72rem] font-semibold tracking-[0.1em] uppercase text-ink-faint mb-2.5">
            Detection Speed
          </p>
          <div className="grid grid-cols-2 gap-2">
            {SPEED_OPTIONS.map(({ label, ms, icon, desc }) => (
              <button
                key={ms}
                onClick={() => onIntervalChange(ms)}
                disabled={isStreaming}
                title={isStreaming ? 'Stop camera to change speed' : desc}
                className={[
                  'flex flex-col items-center gap-1 py-3 px-2 rounded-xl border text-center',
                  'transition-all duration-200',
                  captureInterval === ms
                    ? 'bg-lavender text-white border-lavender shadow-lavender'
                    : 'bg-surface border-edge text-ink-muted hover:border-lavender-soft hover:text-lavender',
                  isStreaming ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                ].join(' ')}
              >
                <span className="text-[1.1rem]">{icon}</span>
                <span className="text-[0.78rem] font-bold">{label}</span>
                <span className={`text-[0.65rem] ${captureInterval === ms ? 'text-white/70' : 'text-ink-faint'}`}>
                  every {ms / 1000}s
                </span>
              </button>
            ))}
          </div>
          {isStreaming && (
            <p className="text-[0.68rem] text-ink-faint mt-1.5 text-center italic">
              Stop camera to change speed
            </p>
          )}
        </div>

        {/* ── Voice gender ── */}
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

        {/* ── Hold timer ── */}
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
            type="range" min="5" max="60" step="5"
            value={holdDuration}
            onChange={(e) => onHoldDurationChange(Number(e.target.value))}
            disabled={isHolding}
            className="w-full h-2 appearance-none rounded-full cursor-pointer disabled:opacity-40"
            style={{
              background: `linear-gradient(to right, #7C6FCD ${((holdDuration - 5) / 55) * 100}%, #E2DEFF ${((holdDuration - 5) / 55) * 100}%)`,
            }}
          />
          <div className="flex justify-between text-[0.68rem] text-ink-faint mt-1">
            <span>5s</span><span>60s</span>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-lavender-pale border border-lavender-soft rounded-xl px-4 py-3">
          <p className="text-[0.72rem] font-semibold text-lavender mb-1.5">How it works</p>
          <ul className="text-[0.72rem] text-ink-muted leading-[1.8] space-y-0.5">
            <li>① Announces detected pose name</li>
            <li>② Guides worst joint correction first</li>
            <li>③ Works through remaining corrections</li>
            <li>④ Starts hold timer when form is perfect</li>
            <li>⑤ Auto-saves snapshot after 3s hold</li>
          </ul>
        </div>

      </div>
    </div>
  )
}

// ── Snapshot flash overlay ────────────────────────────────────────────────────
function SnapshotFlash({ visible, pose }) {
  if (!visible) return null
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center
                    bg-white/80 backdrop-blur-sm rounded-2xl animate-fade-up">
      <span className="text-[2.5rem] mb-2">📸</span>
      <p className="font-display font-bold text-ink text-[1rem]">Snapshot saved!</p>
      <p className="text-ink-muted text-[0.78rem] mt-1">{pose} · saved to dataset/</p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LiveDetection() {
  const { currentUser } = useAuth()

  const [mastery,        setMastery]        = useState({})
  const [sessionSummary, setSessionSummary] = useState(null)
  const [sessionStreak,  setSessionStreak]  = useState(null)
  const [showCard,       setShowCard]       = useState(false)

  // Detection speed — default Normal (3s), user can switch to Beginner (5s)
  const [captureInterval, setCaptureInterval] = useState(3000)

  // Load mastery badges
  useEffect(() => {
    if (!currentUser) return
    getDoc(doc(db, 'users', currentUser.uid)).then((snap) => {
      setMastery(snap.data()?.mastery || {})
    })
  }, [currentUser])

  const { startSession, endSession, recordResult } = useSessionStats()

  const {
    isMuted, toggleMute, gender, setGender,
    holdDuration, setHoldDuration,
    holdCountdown, isHolding,
    onNewResult: speechOnResult,
  } = useSpeech()

  // FIX 4: Must be useRef, not a plain object literal. A plain `{ current: null }`
  // is recreated on every render, so useSnapshot always receives a new ref
  // object and the canvas assignment on the line below never sticks.
  const canvasRef = useRef(null)

  const {
    onNewResult: snapshotOnResult,
    snapshotTaken, lastSnapshot, holdProgress,
  } = useSnapshot({ canvasRef })

  const onResult = useCallback((prediction) => {
    recordResult(prediction)
    speechOnResult(prediction)
    snapshotOnResult(prediction)
  }, [recordResult, speechOnResult, snapshotOnResult])

  const {
    videoRef, canvasRef: detectionCanvasRef,
    isStreaming, isCapturing, loading, result, error,
    startCamera: _startCamera, stopCamera: _stopCamera,
  } = useWebcamDetection({ onResult, captureInterval })

  useEffect(() => {
    canvasRef.current = detectionCanvasRef?.current
  })

  const startCamera = useCallback(async () => {
    startSession()
    await _startCamera()
  }, [startSession, _startCamera])

  const stopCamera = useCallback(async () => {
    _stopCamera()
    const summary = await endSession()
    if (summary) {
      setSessionSummary(summary)
      setSessionStreak(summary.streak)
      setShowCard(true)
    }
  }, [_stopCamera, endSession])

  return (
    <main className="pt-20 min-h-screen">
      <div className="max-w-[1380px] mx-auto px-8 py-10">

        {/* Header */}
        <div className="mb-8 pb-7 border-b border-edge">
          <span className="inline-block bg-lavender-pale border border-lavender-soft rounded-full
                           px-3.5 py-1 text-[0.68rem] font-semibold tracking-[0.1em] uppercase
                           text-lavender mb-3">
            Real-Time Analysis
          </span>
          <h1 className="font-display text-[1.9rem] font-extrabold tracking-tight text-ink mb-2">
            Live Pose Detection
          </h1>
          <p className="text-ink-muted text-[0.88rem] max-w-[520px] leading-[1.72]">
            Position yourself in frame and hold a yoga pose.
            PosePerfect analyses your form every {captureInterval / 1000} seconds.
          </p>
        </div>

        {/* Badges strip */}
        {currentUser && Object.keys(mastery).length > 0 && (
          <div className="mb-6">
            <p className="text-[0.68rem] font-semibold tracking-[0.1em] uppercase text-ink-faint mb-2">
              Your Badges
            </p>
            <BadgeDisplay mastery={mastery} mode="mini" />
          </div>
        )}

        {/* Three-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.85fr_0.65fr] gap-6">

          {/* Left — webcam */}
          <section className="flex flex-col gap-4">
            <div className="relative">
              <WebcamFeed
                videoRef={videoRef}
                isStreaming={isStreaming}
                isCapturing={isCapturing}
                onStart={startCamera}
                onStop={stopCamera}
                result={result}
              />
              <SnapshotFlash visible={snapshotTaken} pose={lastSnapshot?.pose} />
            </div>

            {/* Snapshot progress bar */}
            {isStreaming && holdProgress > 0 && holdProgress < 1 && (
              <div className="bg-white border border-edge rounded-xl px-4 py-3 shadow-card">
                <div className="flex justify-between text-[0.72rem] text-ink-muted mb-1.5">
                  <span>📸 Snapshot in...</span>
                  <span className="text-lavender font-semibold">
                    {Math.ceil((1 - holdProgress) * 3)}s
                  </span>
                </div>
                <div className="h-1.5 bg-surface-mid rounded-full overflow-hidden">
                  <div
                    className="h-full bg-lavender rounded-full transition-all duration-100"
                    style={{ width: `${holdProgress * 100}%` }}
                  />
                </div>
              </div>
            )}

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

          {/* Right — voice + speed panel */}
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
              captureInterval={captureInterval}
              onIntervalChange={setCaptureInterval}
              isStreaming={isStreaming}
            />
          </section>

        </div>
      </div>

      {/* Yoga card */}
      {showCard && sessionSummary && (
        <YogaCard
          summary={sessionSummary}
          streak={sessionStreak}
          onClose={() => setShowCard(false)}
        />
      )}
    </main>
  )
}
