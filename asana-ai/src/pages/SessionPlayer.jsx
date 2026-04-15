/**
 * pages/SessionPlayer.jsx  (v3 — fixed)
 *
 * FIX: canvasRef was `{ current: null }` (plain object, recreated every render).
 *      Changed to `useRef(null)` so useSnapshot can hold the canvas reference
 *      across renders and snapshots actually save.
 *
 * New in v3:
 *  - "End Session" button → saves progress to Firestore, shows ScoreCard
 *  - "Skip Asana" button (preview + perform phases) → marks as skipped
 *  - Resume detection on load → if today's session was paused, asks to resume
 *  - ScoreCard replaces YogaCard (shows completed vs skipped, sends notification)
 *
 * Full session flow:
 *  WarmupScreen → [Preview 5s + Skip → Perform + End/Skip → Break] × N → PranayamaScreen → ScoreCard
 */

import { useCallback, useEffect, useState, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useWebcamDetection } from '../hooks/useWebcamDetection'
import { useSpeech } from '../hooks/useSpeech'
import { useScheduleSession } from '../hooks/useScheduleSession'
import { useSessionStats } from '../hooks/useSessionStats'
import { useSnapshot } from '../hooks/useSnapshot'
import { useSessionPersistence } from '../hooks/useSessionPersistence'
import { LEVEL_DURATION, getAsanaDisplayName } from '../utils/scheduleGenerator'
import AsanaPoseCard from '../components/AsanaPoseCard'
import ResultPanel from '../components/ResultPanel'
import ScoreCard from '../components/ScoreCard'
import WebcamFeed from '../components/WebcamFeed'

const WARMUP_VIDEO_ID    = '_6-k5-w1bZw'
const PRANAYAMA_VIDEO_ID = 'oxdMIe11rQE'

// ── YouTube embed ─────────────────────────────────────────────────────────────
function YouTubeEmbed({ videoId, title, subtitle, icon, onSkip, accentColor = '#7C6FCD' }) {
  const [canSkip, setCanSkip] = useState(false)
  const [countdown, setCountdown] = useState(5)
  useEffect(() => {
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(t); setCanSkip(true); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="fixed inset-0 z-[300] bg-[#0a0a0f] flex flex-col items-center justify-center p-4">
      <div className="text-center mb-6 animate-fade-up">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-[2rem] mx-auto mb-3"
             style={{ background: `${accentColor}22` }}>{icon}</div>
        <h2 className="font-display font-extrabold text-white text-[1.5rem] mb-1">{title}</h2>
        <p className="text-[#9CA3AF] text-[0.85rem]">{subtitle}</p>
      </div>
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-lift animate-fade-up"
           style={{ animationDelay: '0.1s' }}>
        <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
          <iframe className="absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen />
        </div>
      </div>
      <div className="mt-6 animate-fade-up" style={{ animationDelay: '0.2s' }}>
        {canSkip ? (
          <button onClick={onSkip}
            className="px-8 py-3 rounded-2xl font-bold text-white text-[0.95rem]
                       hover:-translate-y-0.5 transition-all duration-200 shadow-lavender"
            style={{ background: accentColor }}>Continue →</button>
        ) : (
          <div className="flex items-center gap-2 text-[#6B7280] text-[0.85rem]">
            <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center
                            text-[0.65rem] font-bold"
                 style={{ borderColor: accentColor, color: accentColor }}>{countdown}</div>
            <span>Skip available in {countdown}s</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Break overlay ─────────────────────────────────────────────────────────────
function BreakOverlay({ seconds, nextAsana }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center
                    bg-white/90 backdrop-blur-sm rounded-2xl">
      <p className="text-[2.5rem] mb-2">☕</p>
      <p className="font-display font-bold text-ink text-[1.2rem] mb-1">Rest Break</p>
      <p className="text-ink-muted text-[0.85rem] mb-4">
        {nextAsana ? `Next: ${nextAsana}` : 'Final asana done!'}
      </p>
      <div className="w-16 h-16 relative flex items-center justify-center">
        <svg className="-rotate-90 absolute" width="64" height="64">
          <circle cx="32" cy="32" r="26" fill="none" stroke="#E2DEFF" strokeWidth="5"/>
          <circle cx="32" cy="32" r="26" fill="none" stroke="#7C6FCD" strokeWidth="5"
            strokeDasharray={`${2*Math.PI*26}`}
            strokeDashoffset={`${2*Math.PI*26*(1 - seconds/10)}`}
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.9s linear' }}/>
        </svg>
        <span className="font-display font-extrabold text-lavender text-[1.4rem] z-10">{seconds}</span>
      </div>
    </div>
  )
}

// ── Perform timer bar ─────────────────────────────────────────────────────────
function PerformTimer({ remaining, total, asanaName }) {
  const pct = total > 0 ? (remaining / total) * 100 : 0
  return (
    <div className="bg-white border border-edge rounded-xl px-5 py-4 shadow-card">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="font-display font-bold text-ink text-[0.95rem]">{asanaName}</p>
          <p className="text-[0.72rem] text-ink-faint">Hold the pose</p>
        </div>
        <div className="text-right">
          <p className="font-display font-extrabold text-lavender text-[2rem] leading-none">{remaining}</p>
          <p className="text-[0.65rem] text-ink-faint">seconds</p>
        </div>
      </div>
      <div className="h-2.5 bg-surface-mid rounded-full overflow-hidden">
        <div className="h-full bg-lavender rounded-full transition-all duration-1000"
             style={{ width: `${pct}%` }}/>
      </div>
    </div>
  )
}

// ── Session progress strip ────────────────────────────────────────────────────
function SessionProgress({ asanas, currentIndex, phase, skippedSlugs }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {asanas.map((slug, i) => (
        <div key={i}
          className={[
            'h-2 rounded-full transition-all duration-500',
            skippedSlugs?.has(slug)  ? 'bg-amber-300 w-6' :
            i < currentIndex         ? 'bg-status-ok w-6' :
            i === currentIndex       ? 'bg-lavender w-10' :
            'bg-surface-dark w-6',
          ].join(' ')}
          title={getAsanaDisplayName(slug)}
        />
      ))}
      <span className="text-[0.7rem] text-ink-faint ml-1 font-medium">
        {currentIndex + 1}/{asanas.length}
      </span>
    </div>
  )
}

// ── Snapshot flash ────────────────────────────────────────────────────────────
function SnapshotFlash({ visible }) {
  if (!visible) return null
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center
                    bg-white/80 backdrop-blur-sm rounded-2xl animate-fade-up">
      <span className="text-[2.5rem] mb-2">📸</span>
      <p className="font-display font-bold text-ink text-[1rem]">Snapshot saved!</p>
      <p className="text-ink-faint text-[0.75rem]">Great form — 85%+ accuracy</p>
    </div>
  )
}

// ── Resume prompt ─────────────────────────────────────────────────────────────
function ResumePrompt({ saved, onResume, onRestart }) {
  const doneCount    = Object.keys(saved.completedAsanas || {}).length
  const skippedCount = (saved.skippedAsanas || []).length
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-3xl p-7 shadow-lift animate-fade-up">
        <div className="w-12 h-12 rounded-2xl bg-lavender-pale flex items-center justify-center
                        text-[1.5rem] mb-4">⏸</div>
        <h2 className="font-display font-bold text-ink text-[1.3rem] mb-1">Resume Session?</h2>
        <p className="text-ink-muted text-[0.88rem] mb-1">
          You paused <strong>{saved.dayName}</strong> earlier today.
        </p>
        <p className="text-ink-faint text-[0.8rem] mb-6">
          {doneCount} done · {skippedCount} skipped · continuing from asana {saved.currentAsanaIndex + 1}
        </p>
        <div className="flex gap-3">
          <button onClick={onResume}
            className="flex-1 py-3 rounded-xl bg-lavender text-white font-bold text-[0.9rem]
                       shadow-lavender hover:bg-lavender-dark transition-all duration-200">
            ▶ Resume
          </button>
          <button onClick={onRestart}
            className="flex-1 py-3 rounded-xl border border-edge text-ink-muted font-medium
                       text-[0.9rem] hover:bg-surface transition-all duration-200">
            Start Over
          </button>
        </div>
      </div>
    </div>
  )
}

// ── End session confirm dialog ────────────────────────────────────────────────
function EndConfirmDialog({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
      <div className="w-full max-w-xs bg-white rounded-2xl p-6 shadow-lift animate-fade-up">
        <p className="font-display font-bold text-ink text-[1.1rem] mb-2">End Session?</p>
        <p className="text-ink-muted text-[0.85rem] mb-5">
          Your progress will be saved. You can resume any time today, but not tomorrow.
        </p>
        <div className="flex gap-3">
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-status-bad text-white font-bold text-[0.875rem]
                       hover:opacity-90 transition-all duration-200">
            End Session
          </button>
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-edge text-ink-muted font-medium
                       text-[0.875rem] hover:bg-surface transition-all duration-200">
            Keep Going
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SessionPlayer() {
  const location = useLocation()
  const navigate  = useNavigate()
  const { userProfile } = useAuth()

  const day          = location.state?.day
  const asanas       = day?.asanas || []
  const poseDuration = LEVEL_DURATION[userProfile?.level] || 35

  // App-level phases
  const [appPhase,       setAppPhase]       = useState('checking')  // checking|idle|warmup|session|pranayama|done
  const [showCard,       setShowCard]       = useState(false)
  const [sessionSummary, setSessionSummary] = useState(null)
  const [sessionStreak,  setSessionStreak]  = useState(null)
  const [sessionStatus,  setSessionStatus]  = useState('completed') // completed|ended
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [savedSession,   setSavedSession]   = useState(null)

  // Track elapsed time for save
  const sessionStartRef = useRef(null)

  const { startSession: startStats, endSession, recordResult } = useSessionStats()
  const { speak, isMuted, toggleMute } = useSpeech()
  const { saveProgress, markCompleted, loadProgress } = useSessionPersistence()

  // ── Check for resumed session on mount ───────────────────────────────────
  useEffect(() => {
    if (!day) { setAppPhase('idle'); return }
    loadProgress().then(saved => {
      if (saved) { setSavedSession(saved); setAppPhase('idle') }
      else        { setAppPhase('idle') }
    })
  }, [])

  const handleAsanaComplete = useCallback(async (accuracies) => {
    const summary = await endSession(accuracies)
    if (summary) {
      setSessionSummary(summary)
      setSessionStreak(summary.streak)
      await markCompleted()
      setAppPhase('pranayama')
    }
  }, [endSession, markCompleted])

  const {
    phase, currentAsanaIndex, currentAsana,
    previewCountdown, performRemaining, breakRemaining,
    skippedSlugs,
    startSession, skipPreview, skipAsana, onNewResult: sessionOnResult,
    getAccuracies, cleanup: cleanupSchedule,
  } = useScheduleSession({ speak, onAsanaComplete: handleAsanaComplete })

  // FIX: Must be useRef, not a plain object literal. A plain `{ current: null }`
  // is recreated on every render, so useSnapshot always receives a new ref
  // object and the canvas assignment never sticks — snapshots silently fail.
  const canvasRef = useRef(null)

  const { onNewResult: snapshotOnResult, snapshotTaken } = useSnapshot({ canvasRef, accuracyThreshold: 85 })

  const onResult = useCallback((prediction) => {
    recordResult(prediction)
    sessionOnResult(prediction)
    snapshotOnResult(prediction)
  }, [recordResult, sessionOnResult, snapshotOnResult])

  const {
    videoRef, canvasRef: camCanvasRef,
    isStreaming, isCapturing, loading, result, error,
    startCamera, stopCamera,
  } = useWebcamDetection({ onResult, captureInterval: 3000, targetAsana: currentAsana?.slug ?? null })

  useEffect(() => { canvasRef.current = camCanvasRef?.current })

  useEffect(() => {
    if (phase === 'perform' && !isStreaming) startCamera()
    if (phase === 'complete' && isStreaming) stopCamera()
  }, [phase, isStreaming, startCamera, stopCamera])

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleStart(startIndex = 0) {
    if (!day || asanas.length === 0) return
    setAppPhase('warmup')
    setSavedSession(null)
  }

  function handleWarmupDone() {
    startStats()
    sessionStartRef.current = Date.now()
    setAppPhase('session')
    const startIdx = savedSession?.currentAsanaIndex ?? 0
    startSession(asanas, poseDuration, startIdx)
  }

  function handlePranayamaDone() {
    setSessionStatus('completed')
    setAppPhase('done')
    setShowCard(true)
  }

  // End session early — non-blocking: show loading state immediately.
  function handleEndConfirm() {
    setShowEndConfirm(false)
    // 1. Stop everything synchronously so the UI unblocks
    stopCamera()
    cleanupSchedule()
    setSessionStatus('ended')
    setAppPhase('ending')   // lightweight "ending…" screen while async work runs

    // 2. Grab current accuracies from schedule hook (slug-keyed)
    const accuracies = getAccuracies()
    const elapsed = sessionStartRef.current
      ? Math.round((Date.now() - sessionStartRef.current) / 1000)
      : 0

    // 3. Async Firestore work — runs in background, UI is already responsive
    ;(async () => {
      try {
        await saveProgress({
          dayName:           day?.dayName,
          asanas,
          currentAsanaIndex,
          completedAsanas:   accuracies,
          skippedAsanas:     [...skippedSlugs],
          elapsedSec:        elapsed,
        })

        const summary = await endSession(accuracies)
        if (summary) {
          setSessionSummary(summary)
          setSessionStreak(summary.streak)
        }
      } catch (err) {
        console.error('handleEndConfirm async error:', err)
      } finally {
        setAppPhase('done')
        setShowCard(true)
      }
    })()
  }

  const nextAsanaName = asanas[currentAsanaIndex + 1]
    ? getAsanaDisplayName(asanas[currentAsanaIndex + 1])
    : null

  // ── Loading / checking ────────────────────────────────────────────────────
  if (appPhase === 'checking' || appPhase === 'ending') {
    return (
      <main className="pt-20 min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 rounded-full border-[3px] border-lavender-soft border-t-lavender animate-spin"/>
          <p className="text-ink-faint text-[0.82rem]">
            {appPhase === 'ending' ? 'Saving session…' : 'Loading session…'}
          </p>
        </div>
      </main>
    )
  }

  // ── Not started ───────────────────────────────────────────────────────────
  if (appPhase === 'idle') {
    return (
      <main className="pt-20 min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <p className="text-[0.7rem] font-semibold tracking-[0.1em] uppercase text-lavender mb-3">
            Today's Session
          </p>
          <h1 className="font-display text-[1.8rem] font-extrabold text-ink mb-3">
            {day?.dayName || 'Session'}
          </h1>
          <p className="text-ink-muted text-[0.9rem] mb-5">
            {asanas.length} asana{asanas.length !== 1 ? 's' : ''} · ~{Math.round(
              (asanas.length * poseDuration + (asanas.length - 1) * 10) / 60
            )} minutes
          </p>

          {/* Flow indicator */}
          <div className="flex items-center justify-center gap-2 mb-6 text-[0.78rem] text-ink-faint">
            <span className="px-2 py-1 rounded-lg bg-lavender-pale text-lavender font-semibold">🔥 Warm-up</span>
            <span>→</span>
            <span className="px-2 py-1 rounded-lg bg-surface-mid font-semibold">{asanas.length} Asanas</span>
            <span>→</span>
            <span className="px-2 py-1 rounded-lg bg-lavender-pale text-lavender font-semibold">🌬️ Pranayama</span>
          </div>

          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {asanas.map(slug => (
              <span key={slug} className="bg-lavender-pale border border-lavender-soft
                                          text-lavender text-[0.78rem] font-medium px-3 py-1.5 rounded-full">
                {getAsanaDisplayName(slug)}
              </span>
            ))}
          </div>

          <button onClick={() => handleStart()}
            className="w-full py-4 rounded-2xl bg-lavender text-white font-bold text-[1rem]
                       shadow-lavender hover:bg-lavender-dark transition-all duration-200 hover:-translate-y-0.5">
            ▶ Start Session
          </button>
          <button onClick={() => navigate('/schedule')}
            className="mt-3 w-full py-3 rounded-2xl border border-edge text-ink-muted font-medium
                       text-[0.9rem] hover:bg-surface transition-all duration-200">
            ← Back to Schedule
          </button>
        </div>

        {/* Resume prompt overlay */}
        {savedSession && (
          <ResumePrompt
            saved={savedSession}
            onResume={() => { setSavedSession(null); handleStart(savedSession.currentAsanaIndex) }}
            onRestart={() => { setSavedSession(null) }}
          />
        )}
      </main>
    )
  }

  // ── Warm-up video ─────────────────────────────────────────────────────────
  if (appPhase === 'warmup') {
    return (
      <YouTubeEmbed videoId={WARMUP_VIDEO_ID} title="Warm-Up First"
        subtitle="Get your body ready before starting the session"
        icon="🔥" onSkip={handleWarmupDone} accentColor="#7C6FCD" />
    )
  }

  // ── Pranayama video ───────────────────────────────────────────────────────
  if (appPhase === 'pranayama') {
    return (
      <YouTubeEmbed videoId={PRANAYAMA_VIDEO_ID} title="Cool Down — Pranayama"
        subtitle="Breathe and restore after your yoga session"
        icon="🌬️" onSkip={handlePranayamaDone} accentColor="#6458B4" />
    )
  }

  // ── Active session ────────────────────────────────────────────────────────
  return (
    <main className="pt-20 min-h-screen bg-surface">
      <div className="max-w-[1280px] mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-[1.5rem] font-extrabold text-ink">
              {day?.dayName} Session
            </h1>
            <SessionProgress
              asanas={asanas} currentIndex={currentAsanaIndex}
              phase={phase} skippedSlugs={skippedSlugs}
            />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleMute}
              className={['flex items-center gap-1.5 px-4 py-2 rounded-xl text-[0.82rem] font-semibold transition-all duration-200',
                isMuted ? 'bg-surface border border-edge text-ink-faint' : 'bg-lavender text-white shadow-lavender'
              ].join(' ')}>
              {isMuted ? '🔇 Muted' : '🔊 Voice On'}
            </button>
            {/* End Session button */}
            <button onClick={() => setShowEndConfirm(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[0.82rem] font-semibold
                         bg-white border border-red-200 text-status-bad hover:bg-red-50
                         transition-all duration-200">
              ⏹ End
            </button>
          </div>
        </div>

        {/* Perform timer */}
        {phase === 'perform' && currentAsana && (
          <div className="mb-4">
            <PerformTimer remaining={performRemaining} total={poseDuration} asanaName={currentAsana.name} />
          </div>
        )}

        {/* Skip Asana button — visible during perform phase */}
        {(phase === 'perform') && (
          <div className="mb-4">
            <button onClick={skipAsana}
              className="w-full py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-700
                         font-semibold text-[0.875rem] hover:bg-amber-100 transition-all duration-200
                         flex items-center justify-center gap-2">
              ⏭ Skip This Asana
            </button>
          </div>
        )}

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-6">
          <section>
            <div className="relative">
              <WebcamFeed videoRef={videoRef} isStreaming={isStreaming}
                isCapturing={isCapturing} onStart={startCamera} onStop={stopCamera}
                result={result} />
              {phase === 'break' && <BreakOverlay seconds={breakRemaining} nextAsana={nextAsanaName} />}
              <SnapshotFlash visible={snapshotTaken} />
            </div>
            {error && (
              <div className="mt-3 px-4 py-3 rounded-xl border border-red-200 bg-red-50
                              text-[0.83rem] text-status-bad">{error}</div>
            )}
          </section>
          <section>
            <ResultPanel result={result} loading={loading && phase === 'perform'} />
          </section>
        </div>
      </div>

      {/* Preview card — also shows "Skip Asana" */}
      {phase === 'preview' && currentAsana && (
        <AsanaPoseCard asana={currentAsana} countdown={previewCountdown}
          onSkip={skipPreview} onSkipAsana={skipAsana} />
      )}

      {/* End confirm dialog */}
      {showEndConfirm && (
        <EndConfirmDialog onConfirm={handleEndConfirm} onCancel={() => setShowEndConfirm(false)} />
      )}

      {/* ScoreCard */}
      {showCard && sessionSummary && (
        <ScoreCard
          summary={sessionSummary}
          streak={sessionStreak}
          skippedSlugs={skippedSlugs}
          dayName={day?.dayName}
          allAsanas={asanas}
          status={sessionStatus}
          onClose={() => { setShowCard(false); navigate('/schedule') }}
        />
      )}
    </main>
  )
}
