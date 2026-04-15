/**
 * components/PoseOverlay.jsx
 *
 * Draws colored body-joint markers on a transparent canvas overlay
 * positioned on top of the webcam video feed.
 *
 *   Green  → joint is correct (status === "ok")
 *   Red    → joint needs fixing (status === "fix")
 *   Gray   → idle / unknown
 *
 * Uses normalised x,y (0–1) from the backend landmarks array.
 */

import { useEffect, useRef } from 'react'

// Skeleton connections between joint names for line drawing
const SKELETON_CONNECTIONS = [
  ['Left Shoulder', 'Left Elbow'],
  ['Left Elbow', 'Left Wrist'],
  ['Right Shoulder', 'Right Elbow'],
  ['Right Elbow', 'Right Wrist'],
  ['Left Shoulder', 'Right Shoulder'],
  ['Left Shoulder', 'Left Hip'],
  ['Right Shoulder', 'Right Hip'],
  ['Left Hip', 'Right Hip'],
  ['Left Hip', 'Left Knee'],
  ['Left Knee', 'Left Ankle'],
  ['Right Hip', 'Right Knee'],
  ['Right Knee', 'Right Ankle'],
]

const STATUS_COLORS = {
  ok:   '#22C55E',   // green-500
  fix:  '#EF4444',   // red-500
  idle: '#9CA3AF',   // gray-400
}

const STATUS_GLOW = {
  ok:   'rgba(34, 197, 94, 0.35)',
  fix:  'rgba(239, 68, 68, 0.35)',
  idle: 'rgba(156, 163, 175, 0.15)',
}

export default function PoseOverlay({ landmarks, videoWidth, videoHeight }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')

    // Match canvas internal resolution to the video feed size
    canvas.width  = videoWidth  || 640
    canvas.height = videoHeight || 480
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (!landmarks || landmarks.length === 0) return

    const lmMap = {}
    landmarks.forEach(lm => { lmMap[lm.name] = lm })

    // ── Draw skeleton lines ──────────────────────────────────────────────
    SKELETON_CONNECTIONS.forEach(([a, b]) => {
      const ptA = lmMap[a]
      const ptB = lmMap[b]
      if (!ptA || !ptB) return

      const ax = ptA.x * canvas.width
      const ay = ptA.y * canvas.height
      const bx = ptB.x * canvas.width
      const by = ptB.y * canvas.height

      // Line color = worst status of the two endpoints
      const worstStatus = (ptA.status === 'fix' || ptB.status === 'fix')
        ? 'fix'
        : (ptA.status === 'ok' && ptB.status === 'ok') ? 'ok' : 'idle'

      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(bx, by)
      ctx.strokeStyle = STATUS_COLORS[worstStatus] + '88'   // semi-transparent
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.stroke()
    })

    // ── Draw joint dots ──────────────────────────────────────────────────
    landmarks.forEach(lm => {
      const x = lm.x * canvas.width
      const y = lm.y * canvas.height
      const color = STATUS_COLORS[lm.status] || STATUS_COLORS.idle
      const glow  = STATUS_GLOW[lm.status]   || STATUS_GLOW.idle

      // Outer glow
      ctx.beginPath()
      ctx.arc(x, y, 12, 0, Math.PI * 2)
      ctx.fillStyle = glow
      ctx.fill()

      // Inner dot
      ctx.beginPath()
      ctx.arc(x, y, 6, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()

      // White edge
      ctx.beginPath()
      ctx.arc(x, y, 6, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'
      ctx.lineWidth = 1.5
      ctx.stroke()
    })
  }, [landmarks, videoWidth, videoHeight])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 10 }}
    />
  )
}
