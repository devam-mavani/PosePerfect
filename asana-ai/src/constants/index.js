/**
 * constants/index.js  (fixed)
 *
 * FIX: SUPPORTED_POSES was mixing display names ("Downward Dog") with raw slugs
 *      ('anjaneyasana'). Standardised to slugs throughout to match ASANA_LIBRARY
 *      in scheduleGenerator.js — use getAsanaDisplayName(slug) anywhere you need
 *      the human-readable version.
 */

export const TECH_STACK = ["React", "Vite", "FastAPI", "TensorFlow", "OpenCV"]

export const IDLE_JOINTS = [
  { name: 'Left Shoulder',  status: 'idle', feedback: '—' },
  { name: 'Right Shoulder', status: 'idle', feedback: '—' },
  { name: 'Left Hip',       status: 'idle', feedback: '—' },
  { name: 'Right Hip',      status: 'idle', feedback: '—' },
  { name: 'Left Knee',      status: 'idle', feedback: '—' },
  { name: 'Right Knee',     status: 'idle', feedback: '—' },
]

// All slugs — must match the class labels in backend/train_angle.csv
// Use getAsanaDisplayName(slug) from scheduleGenerator.js for display names.
export const SUPPORTED_POSES = [
  'downdog',
  'goddess',
  'plank',
  'tree',
  'warrior2',
  'urdhva_dhanurasana',
  'ardha_pincha_mayurasana',
  'anjaneyasana',
  'dandasana',
  'halasana',
  'utkatasana',
  'vajrasana',
  'vasishthasana',
  'bitilasana',
  'warrior_three',
  'nataraja_asana',
  'sarvangasana',
  'ustrasana',
  'uttanasana',
  "baddha_konasana",
]

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export const CAPTURE_INTERVAL_MS = 3000
