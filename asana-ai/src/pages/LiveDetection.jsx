/**
 * pages/LiveDetection.jsx
 *
 * Composes WebcamFeed + ResultPanel.
 * All webcam / API logic is delegated to useWebcamDetection.
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
      <div className="max-w-[1300px] mx-auto px-8 py-10">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="font-display text-[1.8rem] font-extrabold tracking-tight mb-1">
            Live Pose Detection
          </h1>
          <p className="text-muted text-[0.875rem]">
            Position yourself in front of the camera and hold a yoga pose.
            AsanaAI will analyse your form every 1.5 s.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-6">
          {/* Left — webcam */}
          <section className="flex flex-col gap-4">
            <WebcamFeed
              videoRef={videoRef}
              isStreaming={isStreaming}
              isCapturing={isCapturing}
              onStart={startCamera}
              onStop={stopCamera}
            />

            {/* API info / error */}
            {error ? (
              <div className="px-4 py-3 rounded-xl border border-red-posture/30 bg-red-posture/8 text-[0.83rem] text-red-posture">
                {error}
              </div>
            ) : (
              <p className="text-[0.76rem] text-muted leading-relaxed">
                Frames are sent to{' '}
                <code className="bg-white/5 px-1.5 py-0.5 rounded text-sage-light text-[0.74rem]">
                  http://localhost:8000/predict
                </code>{' '}
                — make sure your backend is running. Override the URL via the{' '}
                <code className="bg-white/5 px-1.5 py-0.5 rounded text-sage-light text-[0.74rem]">
                  VITE_API_URL
                </code>{' '}
                environment variable.
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
