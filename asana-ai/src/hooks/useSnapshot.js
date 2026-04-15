/**
 * hooks/useSnapshot.js
 *
 * Takes a snapshot when the user's accuracy crosses 85% and uploads it
 * to the shared Google Drive folder via the backend /upload-snapshot endpoint.
 *
 *   Green flash + "Snapshot saved!" → Drive upload succeeded (or in progress)
 *   No local download occurs.
 *
 * Changes:
 *  - Replaced browser download with uploadSnapshot() API call
 *  - lastSnapshot now contains { pose, viewLink } instead of { pose, dataUrl }
 *  - Upload is fire-and-forget; errors are logged but don't break the session
 */

import { useRef, useState, useCallback } from 'react'
import { uploadSnapshot } from '../services/api'

const FLASH_MS = 1500

export function useSnapshot({ canvasRef, accuracyThreshold = 85 }) {
  const lastPoseRef = useRef(null)
  const snappedRef  = useRef(false)

  const [snapshotTaken, setSnapshotTaken] = useState(false)
  const [lastSnapshot,  setLastSnapshot]  = useState(null)

  const captureAndUpload = useCallback((pose) => {
    const canvas = canvasRef?.current
    if (!canvas) return

    // Draw into a fresh canvas so we don't affect the live feed
    const snap    = document.createElement('canvas')
    snap.width    = canvas.width
    snap.height   = canvas.height
    snap.getContext('2d').drawImage(canvas, 0, 0)

    snap.toBlob(async (blob) => {
      if (!blob) return

      // Show the "Snapshot saved!" flash immediately (optimistic UI)
      setSnapshotTaken(true)
      setTimeout(() => setSnapshotTaken(false), FLASH_MS)

      // Build filename: Downward_Dog_2026-04-15_14-30-00.jpg
      const now      = new Date()
      const dateStr  = now.toISOString().replace('T', '_').replace(/:/g, '-').slice(0, 19)
      const poseName = (pose || 'pose').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
      const filename = `${poseName}_${dateStr}.jpg`

      // Upload to Drive via backend — fire and forget (non-blocking)
      try {
        const result = await uploadSnapshot(blob, pose, filename)
        setLastSnapshot({ pose, viewLink: result.viewLink, filename: result.filename })
        console.info('[Snapshot] Uploaded to Drive:', result.viewLink)
      } catch (err) {
        console.warn('[Snapshot] Drive upload failed (non-critical):', err.message)
        // Fallback: store in-memory dataUrl so lastSnapshot is still set
        const reader = new FileReader()
        reader.onload = e => setLastSnapshot({ pose, viewLink: null, dataUrl: e.target.result, filename })
        reader.readAsDataURL(blob)
      }
    }, 'image/jpeg', 0.92)
  }, [canvasRef])

  const onNewResult = useCallback((result) => {
    if (!result) return
    const { pose, joints, posture_status } = result

    // Reset on pose change
    if (pose !== lastPoseRef.current) {
      lastPoseRef.current = pose
      snappedRef.current  = false
    }

    // Only snap once per pose instance
    if (snappedRef.current) return

    // Calculate accuracy = % of joints that are ok
    if (!joints || joints.length === 0) return
    const goodJoints  = joints.filter(j => j.status === 'ok').length
    const totalJoints = joints.filter(j => j.status !== 'idle').length
    if (totalJoints === 0) return

    const accuracy = (goodJoints / totalJoints) * 100

    if (accuracy >= accuracyThreshold && posture_status === 'correct') {
      snappedRef.current = true
      captureAndUpload(pose)
    }
  }, [accuracyThreshold, captureAndUpload])

  return {
    onNewResult,
    snapshotTaken,
    lastSnapshot,
    holdProgress: 0,  // kept for backward compat
  }
}
