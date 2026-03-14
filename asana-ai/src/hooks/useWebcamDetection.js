/**
 * hooks/useWebcamDetection.js
 *
 * Webcam + prediction logic.
 *
 * Added: accepts an optional onResult(prediction) callback so the
 * speech assistant can be triggered the moment a new result arrives,
 * without needing to watch state from outside.
 *
 * Also includes the activeRef fix so stopping the camera cancels
 * any in-flight prediction responses.
 */

import { useRef, useState, useCallback, useEffect } from 'react'
import { predictPose } from '../services/api'
import { CAPTURE_INTERVAL_MS } from '../constants'

export function useWebcamDetection({ onResult } = {}) {
  const videoRef    = useRef(null)
  const streamRef   = useRef(null)
  const canvasRef   = useRef(document.createElement('canvas'))
  const intervalRef = useRef(null)
  const activeRef   = useRef(false)
  const onResultRef = useRef(onResult)

  // Keep callback ref fresh
  useEffect(() => { onResultRef.current = onResult }, [onResult])

  const [isStreaming, setIsStreaming] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [result,      setResult]      = useState(null)
  const [error,       setError]       = useState(null)

  // ── Frame capture + API call ───────────────────────────────────────────────
  const captureAndPredict = useCallback(async () => {
    const video = videoRef.current
    if (!video || video.readyState < 2) return
    if (!activeRef.current) return

    const canvas  = canvasRef.current
    canvas.width  = video.videoWidth  || 640
    canvas.height = video.videoHeight || 480
    canvas.getContext('2d').drawImage(video, 0, 0)

    canvas.toBlob(
      async (blob) => {
        if (!blob || !activeRef.current) return
        setLoading(true)
        try {
          const prediction = await predictPose(blob)
          if (!activeRef.current) return
          setResult(prediction)
          setError(null)
          // Fire speech callback immediately with fresh result
          onResultRef.current?.(prediction)
        } catch (err) {
          if (!activeRef.current) return
          setError(err.message)
        } finally {
          if (activeRef.current) setLoading(false)
        }
      },
      'image/jpeg',
      0.85,
    )
  }, [])

  // ── Start camera ──────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream
      activeRef.current = true
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

  // ── Stop camera ───────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    activeRef.current = false
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

  // ── Detection loop ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isStreaming) return
    setIsCapturing(true)
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
