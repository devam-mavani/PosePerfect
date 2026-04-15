/**
 * hooks/useSpeech.js
 *
 * Voice assistant for PosePerfect.
 *
 * Behaviour:
 *  1. On every new prediction result:
 *     a. Announces the detected pose name (once per new pose)
 *     b. Finds the joint with the LARGEST angle difference (worst joint)
 *     c. Speaks a correction for that joint first
 *     d. Then reads any other joints that need fixing
 *     e. If ALL joints are "ok" → starts a hold countdown timer
 *  2. Hold timer:
 *     - Counts down from holdDuration (user-set, default 10s)
 *     - Speaks "Hold... X seconds" every second
 *     - Says "Perfect! Well done." when timer ends
 *     - Resets if pose changes or a joint goes wrong again
 *  3. Voice:
 *     - Male: pitch 0.8, rate 0.95
 *     - Female: pitch 1.4, rate 1.0
 *  4. Mute toggle: completely silences all speech
 *
 * Returns:
 *  isMuted          – boolean
 *  toggleMute()     – mute / unmute
 *  gender           – 'male' | 'female'
 *  setGender()      – switch voice gender
 *  holdDuration     – number (seconds)
 *  setHoldDuration  – setter
 *  holdCountdown    – number | null (null = not holding)
 *  isHolding        – boolean
 *  speak(text)      – manually trigger a spoken phrase
 *  onNewResult(r)   – call this whenever a new prediction arrives
 */

import { useRef, useState, useCallback, useEffect } from 'react'

// Extract the numeric angle value from feedback strings like "Increase angle by ~57deg"
function extractAngle(feedback) {
  const match = feedback?.match(/~?(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

// Build a natural spoken correction from joint name + feedback text
function buildCorrection(name, feedback) {
  if (!feedback || feedback === 'mdash') return null
  const lower = feedback.toLowerCase()
  if (lower.includes('looking good') || lower.includes('aligned') || lower.includes('ok')) return null

  const angle = extractAngle(feedback)
  const direction = lower.includes('increase') ? 'increase' : lower.includes('decrease') ? 'decrease' : 'adjust'

  if (angle > 0) {
    return `Adjust your ${name}. ${direction === 'increase' ? 'Open it up' : direction === 'decrease' ? 'Bring it in' : 'Adjust it'} by about ${angle} degrees.`
  }
  return `Adjust your ${name}. ${feedback}`
}

export function useSpeech() {
  const [isMuted,       setIsMuted]       = useState(false)
  const [gender,        setGender]        = useState('female')
  const [holdDuration,  setHoldDuration]  = useState(10)
  const [holdCountdown, setHoldCountdown] = useState(null)
  const [isHolding,     setIsHolding]     = useState(false)

  // FIX 1: Don't access window.speechSynthesis at module/render time.
  // Access it lazily inside callbacks so it is always fresh.
  const lastPoseRef     = useRef(null)
  const holdTimerRef    = useRef(null)
  const isMutedRef      = useRef(false)
  const genderRef       = useRef('female')
  const holdDurationRef = useRef(10)
  // FIX 2: Track isHolding in a ref so onNewResult never has stale state.
  const isHoldingRef    = useRef(false)

  // Keep refs in sync with state
  useEffect(() => { isMutedRef.current      = isMuted      }, [isMuted])
  useEffect(() => { genderRef.current       = gender       }, [gender])
  useEffect(() => { holdDurationRef.current = holdDuration }, [holdDuration])
  useEffect(() => { isHoldingRef.current    = isHolding    }, [isHolding])

  // FIX 3: Load and cache voices after voiceschanged fires.
  // Many browsers return [] from getVoices() until this event triggers.
  const voicesRef = useRef([])
  useEffect(() => {
    const synth = window.speechSynthesis
    const loadVoices = () => { voicesRef.current = synth.getVoices() }
    loadVoices() // works immediately in Firefox
    synth.addEventListener('voiceschanged', loadVoices)
    return () => synth.removeEventListener('voiceschanged', loadVoices)
  }, [])

  // Core speak function
  const speak = useCallback((text, priority = false) => {
    if (isMutedRef.current || !text) return
    const synth = window.speechSynthesis // FIX 1: lazy access

    if (priority) synth.cancel()

    const utt   = new SpeechSynthesisUtterance(text)
    utt.pitch   = genderRef.current === 'female' ? 1.4 : 0.8
    utt.rate    = genderRef.current === 'female' ? 1.0 : 0.95
    utt.volume  = 1
    utt.lang    = 'en-US'

    // FIX 3: use cached voices list
    const voices = voicesRef.current
    if (voices.length > 0) {
      const preferred = voices.find((v) => {
        const name = v.name.toLowerCase()
        return genderRef.current === 'female'
          ? (name.includes('female') || name.includes('samantha') || name.includes('victoria') || name.includes('karen') || name.includes('moira'))
          : (name.includes('male') || name.includes('daniel') || name.includes('alex') || name.includes('fred') || name.includes('tom'))
      })
      if (preferred) utt.voice = preferred
    }

    synth.speak(utt)
  }, []) // stable — only uses refs

  // Stop hold timer
  const stopHoldTimer = useCallback(() => {
    clearInterval(holdTimerRef.current)
    holdTimerRef.current = null
    setHoldCountdown(null)
    setIsHolding(false)
    isHoldingRef.current = false // keep ref in sync immediately
  }, [])

  // Immediately cancel all speech + hold timer (call when camera stops or session ends)
  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel()
    stopHoldTimer()
  }, [stopHoldTimer])

  // Start hold timer
  const startHoldTimer = useCallback(() => {
    stopHoldTimer()
    setIsHolding(true)
    isHoldingRef.current = true // keep ref in sync immediately
    speak('Great form! Now hold this pose.', true)

    let remaining = holdDurationRef.current
    setHoldCountdown(remaining)

    holdTimerRef.current = setInterval(() => {
      remaining -= 1
      setHoldCountdown(remaining)

      if (remaining <= 0) {
        clearInterval(holdTimerRef.current)
        setHoldCountdown(null)
        setIsHolding(false)
        isHoldingRef.current = false
        speak('Perfect! Well done. Excellent pose!', true)
      } else if (remaining <= 5) {
        speak(`${remaining}`, false)
      } else if (remaining % 3 === 0) {
        speak(`Hold... ${remaining} seconds remaining.`, false)
      }
    }, 1000)
  }, [speak, stopHoldTimer]) // stable — reads isHolding via ref

  // FIX 2: Remove `isHolding` from the dependency array.
  // The original code had `isHolding` (state) as a dep, which caused a new
  // onNewResult callback to be created every time isHolding toggled.
  // That in turn recreated `onResult` in LiveDetection, which restarted the
  // capture interval in useWebcamDetection — resetting the hold timer and
  // cutting off speech mid-sentence on every detection cycle.
  // Solution: read isHolding through isHoldingRef (always current).
  const onNewResult = useCallback((result) => {
    if (!result || isMutedRef.current) return

    const { pose, posture_status, joints } = result
    const isNewPose = pose !== lastPoseRef.current

    if (isNewPose) {
      lastPoseRef.current = pose
      stopHoldTimer()
      speak(`${pose} detected.`, true)
      return
    }

    if (posture_status === 'correct') {
      if (!isHoldingRef.current) startHoldTimer() // FIX 2: ref, not stale state
      return
    }

    stopHoldTimer()

    const fixJoints = (joints || [])
      .filter((j) => j.status === 'fix')
      .map((j) => ({ ...j, angleDiff: extractAngle(j.feedback) }))
      .sort((a, b) => b.angleDiff - a.angleDiff)

    if (fixJoints.length === 0) return

    const worst = fixJoints[0]
    const correction = buildCorrection(worst.name, worst.feedback)
    if (correction) speak(correction, true)

    fixJoints.slice(1, 3).forEach((joint, i) => {
      const text = buildCorrection(joint.name, joint.feedback)
      if (!text) return
      setTimeout(() => {
        if (!isMutedRef.current) speak(text, false)
      }, (i + 1) * 3500)
    })
  }, [speak, startHoldTimer, stopHoldTimer]) // stable — no state deps

  const toggleMute = useCallback(() => {
    setIsMuted((m) => {
      if (!m) window.speechSynthesis.cancel()
      return !m
    })
  }, [])

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel()
      clearInterval(holdTimerRef.current)
    }
  }, [])

  return {
    isMuted,
    toggleMute,
    gender,
    setGender,
    holdDuration,
    setHoldDuration,
    holdCountdown,
    isHolding,
    speak,
    stopSpeaking,
    onNewResult,
  }
}
