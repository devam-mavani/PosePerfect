/**
 * contexts/AuthContext.jsx
 *
 * Updated: exposes isOnboardingDone flag so ProtectedRoute can redirect
 * new users to /onboarding before anything else.
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
  doc, setDoc, getDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore'
import { auth, db, googleProvider } from '../config/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser,  setCurrentUser]  = useState(null)
  const [userProfile,  setUserProfile]  = useState(null)
  const [loading,      setLoading]      = useState(true)

  const fetchProfile = useCallback(async (uid) => {
    const snap = await getDoc(doc(db, 'users', uid))
    if (snap.exists()) {
      setUserProfile(snap.data())
      return snap.data()
    }
    setUserProfile(null)
    return null
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)
      if (user) await fetchProfile(user.uid)
      else setUserProfile(null)
      setLoading(false)
    })
    return unsub
  }, [fetchProfile])

  async function signUpWithEmail({ firstName, lastName, age, gender, email, password }) {
    const { user } = await createUserWithEmailAndPassword(auth, email, password)
    const profile  = {
      firstName, lastName, age: Number(age), gender, email,
      provider: 'email', createdAt: serverTimestamp(),
      onboardingDone: false,
    }
    await setDoc(doc(db, 'users', user.uid), profile)
    setUserProfile(profile)
  }

  async function loginWithEmail(email, password) {
    const { user } = await signInWithEmailAndPassword(auth, email, password)
    const profile  = await fetchProfile(user.uid)
    if (!profile) {
      await signOut(auth)
      throw new Error('No account found. Please sign up first.')
    }
  }

  async function loginWithGoogle() {
    const result   = await signInWithPopup(auth, googleProvider)
    const { user } = result
    const profile  = await fetchProfile(user.uid)
    if (!profile) {
      const partial = {
        firstName: user.displayName?.split(' ')[0] ?? '',
        lastName:  user.displayName?.split(' ').slice(1).join(' ') ?? '',
        age: '', gender: '', email: user.email,
        provider: 'google', photoURL: user.photoURL ?? '',
        createdAt: serverTimestamp(),
        profileComplete: false, onboardingDone: false,
      }
      await setDoc(doc(db, 'users', user.uid), partial)
      setUserProfile(partial)
      return { isNewUser: true }
    }
    return { isNewUser: false }
  }

  async function updateUserProfile(fields) {
    if (!currentUser) throw new Error('Not authenticated')
    await updateDoc(doc(db, 'users', currentUser.uid), {
      ...fields, profileComplete: true,
    })
    setUserProfile(prev => ({ ...prev, ...fields, profileComplete: true }))
  }

  async function logout() {
    await signOut(auth)
    setUserProfile(null)
  }

  // Convenience: is onboarding done?
  const isOnboardingDone = userProfile?.onboardingDone === true

  return (
    <AuthContext.Provider value={{
      currentUser, userProfile, loading,
      isOnboardingDone,
      signUpWithEmail, loginWithEmail, loginWithGoogle,
      updateUserProfile, logout,
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
