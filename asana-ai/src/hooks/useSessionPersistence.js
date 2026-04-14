/**
 * hooks/useSessionPersistence.js
 *
 * Saves and restores session progress to/from Firestore so users can:
 *  - End session early and resume the same day
 *  - Not resume a session from a previous day
 *
 * Firestore path:  users/{uid}/activeSession  (single document, overwritten)
 *
 * Document shape:
 *  {
 *    dateKey:          "2025-04-09"          ← ISO date string for the day
 *    dayName:          "Monday"
 *    asanas:           ["downdog","tree",…]
 *    currentAsanaIndex: 2
 *    completedAsanas:  { downdog: 85, tree: 72 }   ← slug → accuracy %
 *    skippedAsanas:    ["warrior2"]
 *    status:           "paused" | "completed"
 *    pausedAt:         serverTimestamp
 *    elapsedSec:       120
 *  }
 */

import { useCallback } from 'react'
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../contexts/AuthContext'

function todayKey() {
  return new Date().toISOString().slice(0, 10)   // "2025-04-09"
}

export function useSessionPersistence() {
  const { currentUser } = useAuth()

  const docRef = useCallback(() => {
    if (!currentUser) return null
    return doc(db, 'users', currentUser.uid, 'meta', 'activeSession')
  }, [currentUser])

  /** Save current progress so the user can resume later today. */
  const saveProgress = useCallback(async ({
    dayName,
    asanas,
    currentAsanaIndex,
    completedAsanas,   // { slug: accuracyPct }
    skippedAsanas,     // [slug, ...]
    elapsedSec,
  }) => {
    const ref = docRef()
    if (!ref) return
    try {
      await setDoc(ref, {
        dateKey: todayKey(),
        dayName,
        asanas,
        currentAsanaIndex,
        completedAsanas,
        skippedAsanas,
        status:   'paused',
        pausedAt: serverTimestamp(),
        elapsedSec,
      })
    } catch (err) {
      console.error('saveProgress failed:', err)
    }
  }, [docRef])

  /** Mark session as fully completed and remove the activeSession doc. */
  const markCompleted = useCallback(async () => {
    const ref = docRef()
    if (!ref) return
    try {
      await deleteDoc(ref)
    } catch (err) {
      console.error('markCompleted failed:', err)
    }
  }, [docRef])

  /**
   * Load a saved session — only if it's from TODAY.
   * Returns the saved doc or null if none / expired.
   */
  const loadProgress = useCallback(async () => {
    const ref = docRef()
    if (!ref) return null
    try {
      const snap = await getDoc(ref)
      if (!snap.exists()) return null
      const data = snap.data()
      // Only valid if the saved day matches today
      if (data.dateKey !== todayKey()) {
        await deleteDoc(ref)   // stale — clean up
        return null
      }
      return data
    } catch (err) {
      console.error('loadProgress failed:', err)
      return null
    }
  }, [docRef])

  return { saveProgress, markCompleted, loadProgress }
}
