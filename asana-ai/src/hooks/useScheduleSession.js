/**
 * hooks/useScheduleSession.js  (fixed)
 *
 * FIX: Stale closure in startPreview's setInterval callback.
 *
 * Root cause: startPreview had `[]` deps so it was only created once, closing
 * over the initial startPerform (which itself captured currentAsanaIndex = 0).
 * From asana 2 onward, the preview countdown would fire the stale startPerform
 * and use the wrong index — the ref was already maintained, just not used here.
 *
 * Fix: change the timer callback to call `startPerformRef.current()` instead of
 * `startPerform()` directly, matching the pattern already used in skipPreview.
 *
 * Returns:
 *  phase, currentAsanaIndex, currentAsana
 *  previewCountdown, performRemaining, breakRemaining
 *  sessionStats, skippedSlugs
 *  startSession(), skipPreview(), skipAsana(), onNewResult()
 */

import { useRef, useState, useCallback, useEffect } from 'react'
import { getAsanaDisplayName, ASANA_LIBRARY } from '../utils/scheduleGenerator'

const PREVIEW_SECS = 5
const BREAK_SECS   = 10

export function useScheduleSession({ speak, onAsanaComplete }) {
  const [phase,             setPhase]             = useState('idle')
  const [currentAsanaIndex, setCurrentAsanaIndex] = useState(0)
  const [previewCountdown,  setPreviewCountdown]  = useState(PREVIEW_SECS)
  const [performRemaining,  setPerformRemaining]  = useState(0)
  const [breakRemaining,    setBreakRemaining]    = useState(0)
  const [sessionStats,      setSessionStats]      = useState({ completed: 0, total: 0, accuracies: {} })
  const [skippedSlugs,      setSkippedSlugs]      = useState(new Set())

  const asanasRef       = useRef([])
  const poseDurationRef = useRef(35)
  const phaseRef        = useRef('idle')
  const timerRef        = useRef(null)
  const accuracyRef     = useRef({})
  const lastSpeakRef    = useRef(0)
  const skippedRef      = useRef(new Set())   // mirror of skippedSlugs for use in callbacks

  useEffect(() => { phaseRef.current = phase }, [phase])

  const clearTimer = () => clearInterval(timerRef.current)

  // ── Advance to next asana or complete ─────────────────────────────────────
  const advance = useCallback((isSkip = false) => {
    const next = currentAsanaIndex + 1
    if (next >= asanasRef.current.length) {
      clearTimer()
      setPhase('complete')
      const accuracies = {}
      for (const [slug, data] of Object.entries(accuracyRef.current)) {
        accuracies[slug] = data.total > 0
          ? Math.round((data.correct / data.total) * 100)
          : 0
      }
      setSessionStats(prev => ({ ...prev, accuracies }))
      onAsanaComplete?.(accuracies)
    } else {
      setCurrentAsanaIndex(next)
      startPreview()
    }
  }, [currentAsanaIndex, onAsanaComplete])

  // ── Preview ───────────────────────────────────────────────────────────────
  const startPreview = useCallback(() => {
    clearTimer()
    setPhase('preview')
    setPreviewCountdown(PREVIEW_SECS)
    let count = PREVIEW_SECS
    timerRef.current = setInterval(() => {
      count -= 1
      setPreviewCountdown(count)
      // FIX: use startPerformRef.current() so we always call the latest version
      // of startPerform (which has the current asanaIndex baked in). Previously
      // startPerform() was called directly from this closure, which was stale
      // after the first asana because startPreview has [] deps.
      if (count <= 0) { clearInterval(timerRef.current); startPerformRef.current() }
    }, 1000)
  }, [])

  // ── Perform ───────────────────────────────────────────────────────────────
  const startPerform = useCallback(() => {
    clearTimer()
    setPhase('perform')
    const dur   = poseDurationRef.current
    const asana = asanasRef.current[currentAsanaIndex]
    const name  = getAsanaDisplayName(asana)
    setPerformRemaining(dur)
    speak(`Now perform ${name}. I will guide you.`, true)
    lastSpeakRef.current = Date.now()
    let rem = dur
    timerRef.current = setInterval(() => {
      rem -= 1
      setPerformRemaining(rem)
      if (rem <= 3 && rem > 0) speak(`${rem}`, false)
      if (rem <= 0) { clearInterval(timerRef.current); startBreakRef.current() }
    }, 1000)
  }, [currentAsanaIndex, speak])

  // ── Break ─────────────────────────────────────────────────────────────────
  const startBreak = useCallback(() => {
    clearTimer()
    setPhase('break')
    setBreakRemaining(BREAK_SECS)
    const nextIdx = currentAsanaIndex + 1
    const hasNext = nextIdx < asanasRef.current.length
    if (hasNext) {
      speak(`Well done! Short break. Next: ${getAsanaDisplayName(asanasRef.current[nextIdx])}.`, true)
    } else {
      speak('Well done! Almost finished. Short break.', true)
    }
    let rem = BREAK_SECS
    timerRef.current = setInterval(() => {
      rem -= 1
      setBreakRemaining(rem)
      if (rem <= 0) { clearInterval(timerRef.current); advanceRef.current() }
    }, 1000)
  }, [currentAsanaIndex, advance, speak])

  const startPerformRef = useRef(startPerform)
  const startBreakRef   = useRef(startBreak)
  const advanceRef      = useRef(advance)
  useEffect(() => { startPerformRef.current = startPerform }, [startPerform])
  useEffect(() => { startBreakRef.current   = startBreak   }, [startBreak])
  useEffect(() => { advanceRef.current      = advance      }, [advance])

  // ── Start session ─────────────────────────────────────────────────────────
  const startSession = useCallback((asanas, poseDuration, startIndex = 0) => {
    clearTimer()
    asanasRef.current       = asanas
    poseDurationRef.current = poseDuration
    accuracyRef.current     = {}
    lastSpeakRef.current    = 0
    skippedRef.current      = new Set()
    setSkippedSlugs(new Set())
    setCurrentAsanaIndex(startIndex)
    setSessionStats({ completed: 0, total: asanas.length, accuracies: {} })
    startPreview()
  }, [startPreview])

  // ── Skip preview (I'm Ready) ───────────────────────────────────────────────
  const skipPreview = useCallback(() => {
    if (phaseRef.current !== 'preview') return
    clearTimer()
    startPerformRef.current()
  }, [])

  /**
   * skipAsana — skip the current asana entirely.
   * Works during preview OR perform phase.
   * Records the slug as skipped so the scorecard can show it.
   */
  const skipAsana = useCallback(() => {
    const phase = phaseRef.current
    if (phase !== 'preview' && phase !== 'perform') return
    clearTimer()

    const slug = asanasRef.current[currentAsanaIndex]
    skippedRef.current = new Set([...skippedRef.current, slug])
    setSkippedSlugs(new Set(skippedRef.current))

    speak('Asana skipped.', false)
    advanceRef.current(true)
  }, [currentAsanaIndex, speak])

  // ── Ref for wrong-asana speech debounce (separate from correction debounce) ──
  const lastWrongAsanaSpeakRef = useRef(0)

  // ── Process prediction ────────────────────────────────────────────────────
  const onNewResult = useCallback((result) => {
    if (phaseRef.current !== 'perform') return

    const slug         = asanasRef.current[currentAsanaIndex]
    const expectedName = getAsanaDisplayName(slug)

    // ── Wrong-asana guard ─────────────────────────────────────────────────
    // If a different (confident) pose is detected, warn the user via voice
    // and skip accuracy tracking — don't penalise the current asana's score.
    if (
      result.pose &&
      result.posture_status !== 'unknown' &&
      result.pose !== 'Unknown Pose' &&
      result.pose.toLowerCase() !== expectedName.toLowerCase()
    ) {
      const now = Date.now()
      if (now - lastWrongAsanaSpeakRef.current > 5000) {
        lastWrongAsanaSpeakRef.current = now
        speak(
          `You are performing a different asana. Please switch to ${expectedName}.`,
          true,  // priority — interrupts any ongoing speech
        )
      }
      return  // do NOT count this frame in accuracy
    }

    if (!accuracyRef.current[slug]) {
      accuracyRef.current[slug] = { correct: 0, total: 0 }
    }
    accuracyRef.current[slug].total += 1
    if (result.posture_status === 'correct') {
      accuracyRef.current[slug].correct += 1
    }

    const now = Date.now()
    if (now - lastSpeakRef.current < 3000) return
    lastSpeakRef.current = now

    if (result.posture_status === 'wrong' && result.joints) {
      const fixJoints = result.joints
        .filter(j => j.status === 'fix')
        .map(j => {
          const match = j.feedback.match(/(\d+)/)
          return { ...j, angle: match ? parseInt(match[1]) : 0 }
        })
        .sort((a, b) => b.angle - a.angle)

      if (fixJoints.length > 0) {
        speak(naturalCorrection(fixJoints[0].name, fixJoints[0].feedback), false)
      }
    }
  }, [currentAsanaIndex, speak])

  useEffect(() => () => clearTimer(), [])

  // ── Expose accuracy snapshot for early-end scenarios ─────────────────────
  const getAccuracies = useCallback(() => {
    const out = {}
    for (const [slug, data] of Object.entries(accuracyRef.current)) {
      out[slug] = data.total > 0
        ? Math.round((data.correct / data.total) * 100)
        : 0
    }
    return out
  }, [])

  // ── Cleanup: stop all timers + reset phase (used by End Session) ────────
  const cleanup = useCallback(() => {
    clearTimer()
    setPhase('idle')
  }, [])

  const currentSlug  = asanasRef.current[currentAsanaIndex]
  const currentAsana = currentSlug ? {
    slug:       currentSlug,
    name:       getAsanaDisplayName(currentSlug),
    totalSteps: ASANA_LIBRARY[currentSlug]?.steps?.length ?? null,
  } : null

  return {
    phase, currentAsanaIndex, currentAsana,
    previewCountdown, performRemaining, breakRemaining,
    sessionStats, skippedSlugs,
    startSession, skipPreview, skipAsana, onNewResult,
    getAccuracies, cleanup,
  }
}

// ── Natural language correction builder ──────────────────────────────────────
const JOINT_DIRECTIONS = {
  'Left Shoulder':  { increase: 'lift your left arm slightly upwards',   decrease: 'lower your left arm slightly' },
  'Right Shoulder': { increase: 'lift your right arm slightly upwards',  decrease: 'lower your right arm slightly' },
  'Left Elbow':     { increase: 'straighten your left elbow a little',   decrease: 'bend your left elbow a little' },
  'Right Elbow':    { increase: 'straighten your right elbow a little',  decrease: 'bend your right elbow a little' },
  'Left Hip':       { increase: 'open your left hip outward',            decrease: 'bring your left hip inward' },
  'Right Hip':      { increase: 'open your right hip outward',           decrease: 'bring your right hip inward' },
  'Left Knee':      { increase: 'straighten your left knee slightly',    decrease: 'bend your left knee a little more' },
  'Right Knee':     { increase: 'straighten your right knee slightly',   decrease: 'bend your right knee a little more' },
  'Left Ankle':     { increase: 'flex your left foot upward',            decrease: 'point your left foot downward' },
  'Right Ankle':    { increase: 'flex your right foot upward',           decrease: 'point your right foot downward' },
}

function naturalCorrection(jointName, feedback) {
  const d = JOINT_DIRECTIONS[jointName]
  if (!d) return `Adjust your ${jointName.toLowerCase()}`
  return feedback.toLowerCase().includes('increase') ? d.increase : d.decrease
}
