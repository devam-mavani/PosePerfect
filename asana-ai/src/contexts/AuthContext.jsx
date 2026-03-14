/**
 * contexts/AuthContext.jsx
 *
 * Provides authentication state and helper methods to the entire app.
 *
 * Exposes:
 *  currentUser      – Firebase Auth user object | null
 *  userProfile      – Firestore profile { firstName, lastName, age, gender, email } | null
 *  loading          – true while auth state is being resolved on first load
 *  signUpWithEmail  – creates auth user + Firestore profile
 *  loginWithEmail   – signs in; rejects if no Firestore profile exists
 *  loginWithGoogle  – Google OAuth; returns { isNewUser } so caller can redirect
 *  updateProfile    – updates Firestore profile fields
 *  logout           – signs out
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { auth, db, googleProvider } from '../config/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser,  setCurrentUser]  = useState(null)
  const [userProfile,  setUserProfile]  = useState(null)
  const [loading,      setLoading]      = useState(true)

  // ── Fetch Firestore profile ───────────────────────────────────────────────
  const fetchProfile = useCallback(async (uid) => {
    const snap = await getDoc(doc(db, 'users', uid))
    if (snap.exists()) {
      setUserProfile(snap.data())
      return snap.data()
    }
    setUserProfile(null)
    return null
  }, [])

  // ── Auth state listener ───────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)
      if (user) {
        await fetchProfile(user.uid)
      } else {
        setUserProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [fetchProfile])

  // ── Sign up with email + password ─────────────────────────────────────────
  async function signUpWithEmail({ firstName, lastName, age, gender, email, password }) {
    const { user } = await createUserWithEmailAndPassword(auth, email, password)
    const profile = {
      firstName,
      lastName,
      age:       Number(age),
      gender,
      email,
      provider:  'email',
      createdAt: serverTimestamp(),
    }
    await setDoc(doc(db, 'users', user.uid), profile)
    setUserProfile(profile)
  }

  // ── Login with email + password ───────────────────────────────────────────
  async function loginWithEmail(email, password) {
    const { user } = await signInWithEmailAndPassword(auth, email, password)
    // Verify a Firestore profile exists (i.e. they signed up through our form)
    const profile = await fetchProfile(user.uid)
    if (!profile) {
      await signOut(auth)
      throw new Error('No account found. Please sign up first.')
    }
  }

  // ── Login / sign-up with Google ───────────────────────────────────────────
  // Returns { isNewUser: boolean } so the caller can redirect to /complete-profile
  async function loginWithGoogle() {
    const result  = await signInWithPopup(auth, googleProvider)
    const { user } = result
    const profile  = await fetchProfile(user.uid)

    if (!profile) {
      // First time — seed a partial profile from Google data
      const partial = {
        firstName: user.displayName?.split(' ')[0] ?? '',
        lastName:  user.displayName?.split(' ').slice(1).join(' ') ?? '',
        age:       '',
        gender:    '',
        email:     user.email,
        provider:  'google',
        photoURL:  user.photoURL ?? '',
        createdAt: serverTimestamp(),
        profileComplete: false,
      }
      await setDoc(doc(db, 'users', user.uid), partial)
      setUserProfile(partial)
      return { isNewUser: true }
    }

    return { isNewUser: false }
  }

  // ── Update Firestore profile ──────────────────────────────────────────────
  async function updateUserProfile(fields) {
    if (!currentUser) throw new Error('Not authenticated')
    await updateDoc(doc(db, 'users', currentUser.uid), {
      ...fields,
      profileComplete: true,
    })
    setUserProfile((prev) => ({ ...prev, ...fields, profileComplete: true }))
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  async function logout() {
    await signOut(auth)
    setUserProfile(null)
  }

  return (
    <AuthContext.Provider value={{
      currentUser,
      userProfile,
      loading,
      signUpWithEmail,
      loginWithEmail,
      loginWithGoogle,
      updateUserProfile,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
