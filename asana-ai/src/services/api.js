/**
 * services/api.js  (v3 — fixed)
 *
 * FIX: Added notifyAdminMessage() — was missing despite the backend having a
 *      working POST /notify/admin-message endpoint. Admin.jsx calls were
 *      silently failing because the function didn't exist in this module.
 */

import axios from 'axios'
import { API_BASE_URL } from '../constants'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
})

apiClient.interceptors.response.use(
  response => response,
  error => {
    const message =
      error.response?.data?.detail ??
      error.response?.data?.message ??
      error.message ??
      'Unknown error from prediction service'
    return Promise.reject(new Error(message))
  },
)

function normalise(data) {
  return {
    ...data,
    pose: data.pose ?? data.asana ?? 'Unknown',
  }
}

/** Send a JPEG webcam frame to /predict. */
export async function predictPose(frameBlob) {
  const formData = new FormData()
  formData.append('file', frameBlob, 'frame.jpg')
  const { data } = await apiClient.post('/predict', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return normalise(data)
}

/** Fetch supported asana list. */
export async function fetchAsanas() {
  const { data } = await apiClient.get('/asanas')
  return data
}

/** Health check. */
export async function checkHealth() {
  try { await apiClient.get('/health'); return true }
  catch { return false }
}

/**
 * Send session scorecard via email + Telegram.
 * Called automatically by ScoreCard.jsx after session ends.
 *
 * @param {object} data
 *  userEmail, telegramChatId, userName,
 *  completedAsanas [[slug, displayName],...],
 *  skippedAsanas   [[slug, displayName],...],
 *  accuracies      {slug: pct},
 *  avgAccuracy, durationSec, streak, dayName, status, date
 */
export async function notifySession(data) {
  const { data: result } = await apiClient.post('/notify/session', data)
  return result
}

/**
 * Send Duolingo-style skip reminder.
 * Called by Schedule.jsx when user taps "Skip Today".
 *
 * @param {object} data
 *  userEmail, telegramChatId, userName, asanaCount, estimatedMinutes
 */
export async function notifySkip(data) {
  const { data: result } = await apiClient.post('/notify/skip', data)
  return result
}

/**
 * Send a free-form admin message to a user via email and/or Telegram.
 * Called by Admin.jsx when an admin submits a custom message.
 *
 * @param {object} data
 *  userEmail, telegramChatId, userName, customMessage, subject?,
 *  asanaCount?, estimatedMinutes?
 */
export async function notifyAdminMessage(data) {
  const { data: result } = await apiClient.post('/notify/admin-message', data)
  return result
}

/**
 * Upload a pose snapshot (JPEG blob) to the shared Google Drive folder.
 * Called by useSnapshot.js when accuracy ≥ threshold.
 *
 * @param {Blob}   blob      JPEG image blob
 * @param {string} pose      Detected pose display name (e.g. "Downward Dog")
 * @param {string} filename  Suggested filename
 * @returns {{ fileId, viewLink, filename }}
 */
export async function uploadSnapshot(blob, pose, filename) {
  const formData = new FormData()
  formData.append('file', blob, filename)
  formData.append('pose', pose)
  const { data } = await apiClient.post('/upload-snapshot', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    // Snapshot upload can be slow on first request (Drive auth); allow 30s
    timeout: 30_000,
  })
  return data
}

export default apiClient

