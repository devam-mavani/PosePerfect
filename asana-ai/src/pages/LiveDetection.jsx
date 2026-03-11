/**
 * pages/LiveDetection.jsx
 *
 * Lavender + white detection view.
 */

import WebcamFeed  from '../components/WebcamFeed'
import ResultPanel from '../components/ResultPanel'
import { useWebcamDetection } from '../hooks/useWebcamDetection'

export default function LiveDetection() {
  const {
    videoRef,
    isStreaming,
    isCapturing,
    loading,
    result,
    error,
    startCamera,
    stopCamera,
  } = useWebcamDetection()

  return (
    <main className="pt-20 min-h-screen">
      <div className="max-w-[1280px] mx-auto px-8 py-10">

        {/* Page header */}
        <div className="mb-8 pb-7 border-b border-edge">
          <span className="inline-block bg-lavender-pale border border-lavender-soft rounded-full
                           px-3.5 py-1 text-[0.68rem] font-semibold tracking-[0.1em] uppercase text-lavender mb-3">
            Real-Time Analysis
          </span>
          <h1 className="font-display text-[1.9rem] font-extrabold tracking-tight text-ink mb-2">
            Live Pose Detection
          </h1>
          <p className="text-ink-muted text-[0.88rem] max-w-[520px] leading-[1.72]">
            Position yourself in frame and hold a yoga pose.
            PosePerfect analyses your form every 1.5 s — adjust in real time.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">

          {/* Left — webcam */}
          <section className="flex flex-col gap-4">
            <WebcamFeed
              videoRef={videoRef}
              isStreaming={isStreaming}
              isCapturing={isCapturing}
              onStart={startCamera}
              onStop={stopCamera}
            />

            {error ? (
              <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50
                              text-[0.83rem] text-status-bad">
                {error}
              </div>
            ) : (
              <p className="text-[0.76rem] text-ink-faint leading-relaxed">
                Frames are sent to{' '}
                <code className="bg-lavender-pale border border-lavender-soft px-1.5 py-0.5
                                 rounded text-lavender text-[0.74rem]">
                  http://localhost:8000/predict
                </code>{' '}
                — make sure your backend is running. Override via{' '}
                <code className="bg-lavender-pale border border-lavender-soft px-1.5 py-0.5
                                 rounded text-lavender text-[0.74rem]">
                  VITE_API_URL
                </code>.
              </p>
            )}
          </section>

          {/* Right — results */}
          <section>
            <ResultPanel result={result} loading={loading} />
          </section>

        </div>
      </div>
    </main>
  )
}
