/**
 * hooks/useSnapshot.js
 *
 * Takes a snapshot when the user's accuracy crosses 85%.
 *
 * Changes from previous version:
 *  - Snapshot triggers when (correct_joints / total_joints) >= 85%
 *    instead of the old "hold correct for 3 seconds" method
 *  - Only one snapshot per asana session (resets when pose changes)
 *  - accuracyThreshold prop (default 85)
 */

import { useRef, useState, useCallback } from 'react'

const FLASH_MS = 1500

export function useSnapshot({ canvasRef, accuracyThreshold = 85 }) {
  const lastPoseRef    = useRef(null)
  const snappedRef     = useRef(false)

  const [snapshotTaken, setSnapshotTaken] = useState(false)
  const [lastSnapshot,  setLastSnapshot]  = useState(null)

  const downloadSnapshot = useCallback((pose) => {
    const canvas = canvasRef?.current
    if (!canvas) return

    const snap    = document.createElement('canvas')
    snap.width    = canvas.width
    snap.height   = canvas.height
    snap.getContext('2d').drawImage(canvas, 0, 0)

    snap.toBlob((blob) => {
      if (!blob) return
      const now      = new Date()
      const dateStr  = now.toISOString().replace('T', '_').replace(/:/g, '-').slice(0, 19)
      const poseName = (pose || 'pose').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
      const filename = `${poseName}_${dateStr}.jpg`

      const url  = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href  = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)

      const reader  = new FileReader()
      reader.onload = e => setLastSnapshot({ pose, dataUrl: e.target.result })
      reader.readAsDataURL(blob)

      setSnapshotTaken(true)
      setTimeout(() => setSnapshotTaken(false), FLASH_MS)
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
      downloadSnapshot(pose)
    }
  }, [accuracyThreshold, downloadSnapshot])

  return {
    onNewResult,
    snapshotTaken,
    lastSnapshot,
    holdProgress: 0,  // kept for backward compat
  }
}
