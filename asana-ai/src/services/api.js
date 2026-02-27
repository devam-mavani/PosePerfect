/**
 * services/api.js
 *
 * Centralised API layer for the AsanaAI backend.
 * All HTTP calls go through this file so the rest of the application
 * never imports axios directly and the base URL lives in one place.
 *
 * Expected POST /predict response shape:
 * {
 *   pose:           string,          // e.g. "Warrior II"
 *   confidence:     number,          // 0 – 1
 *   posture_status: "correct"|"wrong",
 *   joints: Array<{
 *     name:     string,
 *     status:   "ok" | "fix",
 *     feedback: string,
 *   }>
 * }
 */

import axios from 'axios'
import { API_BASE_URL } from '../constants'

// ── Axios instance ────────────────────────────────────────────────────────────

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10_000, // 10 s — enough for a cold-start inference
})

// ── Request interceptor: attach auth headers if needed in the future ─────────
apiClient.interceptors.request.use(
  (config) => {
    // Example: config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error),
)

// ── Response interceptor: normalise errors ───────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail ??
      error.response?.data?.message ??
      error.message ??
      'Unknown error from prediction service'
    return Promise.reject(new Error(message))
  },
)

// ── API methods ───────────────────────────────────────────────────────────────

/**
 * Send a single JPEG frame blob to the prediction endpoint.
 *
 * @param {Blob} frameBlob - JPEG image captured from the webcam canvas.
 * @returns {Promise<PredictionResult>}
 */
export async function predictPose(frameBlob) {
  const formData = new FormData()
  formData.append('file', frameBlob, 'frame.jpg')

  const { data } = await apiClient.post('/predict', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  return data
}

/**
 * Health-check — useful to verify the backend is reachable before
 * starting the webcam session.
 *
 * @returns {Promise<boolean>}
 */
export async function checkHealth() {
  try {
    await apiClient.get('/health')
    return true
  } catch {
    return false
  }
}

export default apiClient
