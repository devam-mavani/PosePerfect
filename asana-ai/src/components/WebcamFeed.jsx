/**
 * components/WebcamFeed.jsx
 *
 * Lavender + white webcam feed panel.
 * Now includes a PoseOverlay canvas for body joint markers.
 */

import { useState, useEffect } from 'react'
import PoseOverlay from './PoseOverlay'

export default function WebcamFeed({ videoRef, isStreaming, isCapturing, onStart, onStop, result }) {
  // Track actual video dimensions for the overlay canvas
  const [videoDims, setVideoDims] = useState({ w: 640, h: 480 })

  useEffect(() => {
    const video = videoRef?.current
    if (!video) return

    function updateDims() {
      if (video.videoWidth && video.videoHeight) {
        setVideoDims({ w: video.videoWidth, h: video.videoHeight })
      }
    }

    video.addEventListener('loadedmetadata', updateDims)
    video.addEventListener('resize', updateDims)
    // Also check immediately in case already loaded
    updateDims()

    return () => {
      video.removeEventListener('loadedmetadata', updateDims)
      video.removeEventListener('resize', updateDims)
    }
  }, [videoRef, isStreaming])

  const landmarks = result?.landmarks || []

  return (
    <div className="rounded-2xl overflow-hidden border border-edge bg-white shadow-card flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-edge bg-surface">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-lavender-pale flex items-center justify-center">
            <span className="text-[0.8rem]">📷</span>
          </div>
          <span className="font-display font-bold text-[0.92rem] text-ink tracking-tight">
            Live Feed
          </span>
        </div>
        {isStreaming && (
          <span className="flex items-center gap-1.5 text-[0.7rem] font-semibold tracking-[0.1em]
                           uppercase text-status-bad bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-status-bad rec-dot" />
            Live
          </span>
        )}
      </div>

      {/* Video / Placeholder */}
      <div className="relative bg-surface-mid min-h-[360px] flex items-center justify-center flex-1">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={[
            'w-full block',
            isStreaming ? 'opacity-100' : 'opacity-0 absolute',
          ].join(' ')}
        />

        {/* Body marker overlay — only visible when streaming and landmarks exist */}
        {isStreaming && landmarks.length > 0 && (
          <PoseOverlay
            landmarks={landmarks}
            videoWidth={videoDims.w}
            videoHeight={videoDims.h}
          />
        )}

        {!isStreaming && (
          <div className="flex flex-col items-center gap-4 text-ink-faint px-8 py-14 select-none">
            <div className="w-20 h-20 rounded-2xl bg-lavender-pale border border-lavender-soft
                            flex items-center justify-center">
              <span className="text-4xl opacity-60">🧘</span>
            </div>
            <div className="text-center">
              <p className="font-display text-[0.95rem] font-semibold text-ink-muted mb-1">
                Camera is off
              </p>
              <p className="text-[0.8rem] leading-relaxed max-w-[200px]">
                Click <strong className="text-lavender font-semibold">Start Camera</strong> to
                begin real-time pose detection
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-3 px-5 py-4 border-t border-edge bg-surface">
        {!isStreaming ? (
          <button
            onClick={onStart}
            className="flex-1 py-2.5 rounded-xl bg-lavender text-white text-[0.875rem] font-semibold
                       tracking-wide shadow-lavender transition-all duration-200
                       hover:bg-lavender-dark hover:shadow-lift hover:-translate-y-0.5 active:scale-[0.98]"
          >
            Start Camera
          </button>
        ) : (
          <button
            onClick={onStop}
            className="flex-1 py-2.5 rounded-xl border border-red-200 text-status-bad bg-red-50
                       text-[0.875rem] font-medium tracking-wide transition-all duration-200
                       hover:bg-red-100 active:scale-[0.98]"
          >
            ■ Stop
          </button>
        )}

        <div
          className={[
            'flex-1 py-2.5 rounded-xl border text-[0.82rem] font-medium tracking-wide text-center select-none transition-all duration-200',
            isCapturing
              ? 'border-lavender-soft text-lavender bg-lavender-pale'
              : 'border-edge text-ink-faint bg-surface-mid',
          ].join(' ')}
        >
          {isCapturing ? '⚡ Detecting…' : '🎯 Auto-detect'}
        </div>
      </div>
    </div>
  )
}

