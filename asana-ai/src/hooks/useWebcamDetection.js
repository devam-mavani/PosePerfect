/**
 * hooks/useWebcamDetection.js
 *
 * Encapsulates all webcam + prediction logic so the LiveDetection page
 * stays declarative and clean.
 *
 * Returns:
 *  videoRef       – attach to <video> element
 *  isStreaming    – whether camera is on
 *  isCapturing    – whether the auto-detect loop is running
 *  loading        – whether a prediction request is in-flight
 *  result         – latest PredictionResult | null
 *  error          – latest error string | null
 *  startCamera()  – request getUserMedia and begin detection loop
 *  stopCamera()   – tear down stream and clear state
 */

import { useRef, useState, useCallback, useEffect } from 'react'
import { predictPose } from '../services/api'
import { CAPTURE_INTERVAL_MS } from '../constants'

export function useWebcamDetection() {
  const videoRef    = useRef(null)
  const streamRef   = useRef(null)
  const canvasRef   = useRef(document.createElement('canvas'))
  const intervalRef = useRef(null)

  const [isStreaming, setIsStreaming] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [result,      setResult]      = useState(null)
  const [error,       setError]       = useState(null)

  // ── Frame capture + API call ───────────────────────────────────────────────
  const captureAndPredict = useCallback(async () => {
    const video = videoRef.current
    if (!video || video.readyState < 2) return

    const canvas  = canvasRef.current
    canvas.width  = video.videoWidth  || 640
    canvas.height = video.videoHeight || 480
    canvas.getContext('2d').drawImage(video, 0, 0)

    canvas.toBlob(
      async (blob) => {
        if (!blob) return
        setLoading(true)
        try {
          const prediction = await predictPose(blob)
          setResult(prediction)
          setError(null)
        } catch (err) {
          // Don't clobber the last good result on transient failures
          setError(err.message)
        } finally {
          setLoading(false)
        }
      },
      'image/jpeg',
      0.85,
    )
  }, [])

  // ── Start camera + detection loop ─────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setIsStreaming(true)
    } catch (err) {
      const msg =
        err.name === 'NotAllowedError'
          ? 'Camera access was denied. Please allow camera permissions and try again.'
          : err.name === 'NotFoundError'
          ? 'No camera device found on this machine.'
          : `Camera error: ${err.message}`
      setError(msg)
    }
  }, [])

  // ── Stop camera + detection loop ──────────────────────────────────────────
  const stopCamera = useCallback(() => {
    clearInterval(intervalRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setIsStreaming(false)
    setIsCapturing(false)
    setLoading(false)
    setResult(null)
    setError(null)
  }, [])

  // ── Detection loop: starts when camera is streaming ───────────────────────
  useEffect(() => {
    if (!isStreaming) return

    setIsCapturing(true)
    // Run once immediately then on interval
    captureAndPredict()
    intervalRef.current = setInterval(captureAndPredict, CAPTURE_INTERVAL_MS)

    return () => {
      clearInterval(intervalRef.current)
      setIsCapturing(false)
    }
  }, [isStreaming, captureAndPredict])

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => () => stopCamera(), [stopCamera])

  return {
    videoRef,
    isStreaming,
    isCapturing,
    loading,
    result,
    error,
    startCamera,
    stopCamera,
  }
}
