/**
 * config/firebase.js
 *
 * Firebase initialisation.
 *
 * ── Setup instructions ──────────────────────────────────────────────────────
 * 1. Go to https://console.firebase.google.com
 * 2. Create a project (or open your existing one)
 * 3. Add a Web app  →  copy the firebaseConfig object below
 * 4. Enable Authentication:
 *      Console → Authentication → Sign-in method
 *      → Enable "Email/Password"
 *      → Enable "Google"
 * 5. Enable Firestore:
 *      Console → Firestore Database → Create database (start in test mode)
 * 6. Paste your real values into the .env file:
 *
 *      VITE_FIREBASE_API_KEY=...
 *      VITE_FIREBASE_AUTH_DOMAIN=...
 *      VITE_FIREBASE_PROJECT_ID=...
 *      VITE_FIREBASE_STORAGE_BUCKET=...
 *      VITE_FIREBASE_MESSAGING_SENDER_ID=...
 *      VITE_FIREBASE_APP_ID=...
 * ────────────────────────────────────────────────────────────────────────────
 */

import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

export const auth           = getAuth(app)
export const db             = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()
