/**
 * hooks/useSessionStats.js
 *
 * Tracks everything that happens in a single detection session:
 *  - Which poses were detected and how many times
 *  - Accuracy per pose (% of frames where posture_status === 'correct')
 *  - Total session time
 *  - Overall average accuracy
 *
 * Also handles:
 *  - Saving the session summary to Firestore when the session ends
 *  - Updating streak in Firestore (via the streak field on user doc)
 *  - Updating pose mastery levels (badge progression)
 *
 * Firestore structure:
 *  users/{uid}/sessions/{sessionId}  → session summary doc
 *  users/{uid}                        → { streak, lastPracticeDate, mastery: { [pose]: count } }
 *
 * Returns:
 *  sessionStats     – current live stats object
 *  startSession()   – call when camera starts
 *  endSession()     – call when camera stops → saves to Firestore → returns summary
 *  recordResult(r)  – call on every prediction result
 */

import { useRef, useState, useCallback } from 'react'
import { doc, updateDoc, setDoc, getDoc, serverTimestamp, increment } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../contexts/AuthContext'

// Pose mastery thresholds — number of high-accuracy sessions needed per badge tier
export const MASTERY_TIERS = {
  0:  { label: 'Beginner',     color: '#A09BBF', emoji: '🌱' },
  3:  { label: 'Novice',       color: '#7C6FCD', emoji: '⭐' },
  10: { label: 'Practitioner', color: '#5B4FB5', emoji: '🔥' },
  25: { label: 'Expert',       color: '#F59E0B', emoji: '💎' },
  50: { label: 'Master',       color: '#10B981', emoji: '🏆' },
}

export function getMasteryTier(count) {
  const thresholds = Object.keys(MASTERY_TIERS).map(Number).sort((a, b) => b - a)
  for (const t of thresholds) {
    if (count >= t) return { ...MASTERY_TIERS[t], count }
  }
  return { ...MASTERY_TIERS[0], count }
}

export function useSessionStats() {
  const { currentUser } = useAuth()

  // Per-pose tracking: { [poseName]: { total: n, correct: n } }
  const poseDataRef   = useRef({})
  const startTimeRef  = useRef(null)
  const [sessionStats, setSessionStats] = useState(null)

  // ── Start session ─────────────────────────────────────────────────────────
  const startSession = useCallback(() => {
    poseDataRef.current  = {}
    startTimeRef.current = Date.now()
    setSessionStats(null)
  }, [])

  // ── Record each prediction ────────────────────────────────────────────────
  const recordResult = useCallback((result) => {
    if (!result?.pose) return
    const { pose, posture_status } = result
    if (!poseDataRef.current[pose]) {
      poseDataRef.current[pose] = { total: 0, correct: 0 }
    }
    poseDataRef.current[pose].total   += 1
    poseDataRef.current[pose].correct += posture_status === 'correct' ? 1 : 0
  }, [])

  // ── End session → save to Firestore ──────────────────────────────────────
  const endSession = useCallback(async () => {
    if (!startTimeRef.current) return null

    const durationSec = Math.round((Date.now() - startTimeRef.current) / 1000)
    const poseData    = poseDataRef.current
    const poses       = Object.keys(poseData)

    if (poses.length === 0) return null

    // Build per-pose accuracy
    const poseAccuracy = {}
    let totalCorrect = 0
    let totalFrames  = 0

    poses.forEach((pose) => {
      const { total, correct } = poseData[pose]
      poseAccuracy[pose] = Math.round((correct / total) * 100)
      totalCorrect += correct
      totalFrames  += total
    })

    const avgAccuracy = totalFrames > 0 ? Math.round((totalCorrect / totalFrames) * 100) : 0

    const summary = {
      poses:       poses,
      poseAccuracy,
      avgAccuracy,
      durationSec,
      date:        new Date().toISOString(),
      timestamp:   serverTimestamp(),
    }

    setSessionStats(summary)

    // Save to Firestore if logged in
    if (currentUser) {
      try {
        const uid        = currentUser.uid
        const sessionRef = doc(db, 'users', uid, 'sessions', `${Date.now()}`)
        await setDoc(sessionRef, summary)

        // Update streak + mastery on user doc
        const userRef  = doc(db, 'users', uid)
        const userSnap = await getDoc(userRef)
        const userData = userSnap.data() || {}

        const today         = new Date().toDateString()
        const lastPractice  = userData.lastPracticeDate
        const currentStreak = userData.streak || 0

        // Streak logic
        let newStreak = currentStreak
        if (lastPractice === today) {
          // Already practiced today — no change
          newStreak = currentStreak
        } else {
          const yesterday = new Date(Date.now() - 86400000).toDateString()
          newStreak = lastPractice === yesterday ? currentStreak + 1 : 1
        }

        // Mastery update — increment high-accuracy pose counts
        const masteryUpdate = {}
        poses.forEach((pose) => {
          if (poseAccuracy[pose] >= 90) {
            const key = `mastery.${pose.replace(/\s+/g, '_')}`
            masteryUpdate[key] = increment(1)
          }
        })

        await updateDoc(userRef, {
          streak:           newStreak,
          lastPracticeDate: today,
          totalSessions:    increment(1),
          ...masteryUpdate,
        })

        return { ...summary, streak: newStreak }
      } catch (err) {
        console.error('Failed to save session:', err)
      }
    }

    return summary
  }, [currentUser])

  return {
    sessionStats,
    startSession,
    endSession,
    recordResult,
  }
}
