/**
 * components/WebcamFeed.jsx
 *
 * Renders the webcam video element or a placeholder when the camera is off.
 * All camera logic lives in the useWebcamDetection hook — this component is
 * purely presentational.
 *
 * Props:
 *  videoRef      – ref forwarded to <video>
 *  isStreaming   – boolean
 *  isCapturing   – boolean (detection loop is running)
 *  onStart()     – callback
 *  onStop()      – callback
 */

export default function WebcamFeed({ videoRef, isStreaming, isCapturing, onStart, onStop }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-sage/10 bg-charcoal-mid flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-sage/10">
        <span className="font-display font-bold text-[0.9rem] tracking-wide">Live Feed</span>
        {isStreaming && (
          <span className="flex items-center gap-1.5 text-[0.7rem] font-semibold tracking-widest uppercase text-red-posture">
            <span className="w-1.5 h-1.5 rounded-full bg-red-posture animate-pulse" />
            REC
          </span>
        )}
      </div>

      {/* Video / Placeholder */}
      <div className="relative bg-black/60 min-h-[360px] flex items-center justify-center flex-1">
        {/* Always render <video> so the ref is valid; hide when not streaming */}
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

        {!isStreaming && (
          <div className="flex flex-col items-center gap-3 text-muted px-8 py-12 select-none">
            <span className="text-5xl opacity-30">📷</span>
            <p className="text-[0.9rem] font-medium">Camera is off</p>
            <p className="text-[0.78rem] text-center leading-relaxed">
              Click <strong className="text-sage-light font-medium">Start Camera</strong> to begin
              real-time pose detection
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-3 px-5 py-3.5 border-t border-sage/10">
        {!isStreaming ? (
          <button
            onClick={onStart}
            className="flex-1 py-2.5 rounded-xl bg-sage text-charcoal text-[0.85rem] font-semibold
                       tracking-wide transition-all duration-200 hover:bg-sage-light hover:shadow-lg hover:shadow-sage/20 active:scale-[0.98]"
          >
            ▶ Start Camera
          </button>
        ) : (
          <button
            onClick={onStop}
            className="flex-1 py-2.5 rounded-xl border border-red-posture/40 text-red-posture
                       text-[0.85rem] font-medium tracking-wide transition-all duration-200
                       hover:bg-red-posture/10 active:scale-[0.98]"
          >
            ■ Stop
          </button>
        )}

        <div
          className={[
            'flex-1 py-2.5 rounded-xl border text-[0.82rem] font-medium tracking-wide text-center select-none',
            isCapturing
              ? 'border-sage/40 text-sage-light bg-sage/5'
              : 'border-white/10 text-muted',
          ].join(' ')}
        >
          {isCapturing ? '⚡ Detecting…' : '🎯 Auto-detect'}
        </div>
      </div>
    </div>
  )
}
