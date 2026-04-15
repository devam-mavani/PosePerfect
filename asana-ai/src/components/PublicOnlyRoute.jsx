/**
 * components/PublicOnlyRoute.jsx
 *
 * Wraps routes that should ONLY be visible to guests (not logged-in users).
 * Examples: /login, /signup
 *
 * Behaviour:
 *  - While Firebase auth is still initialising → show spinner (prevents flash)
 *  - If user is logged in → redirect to /dashboard (or wherever they came from)
 *  - If user is NOT logged in → render children normally
 */

import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from './LoadingSpinner'

export default function PublicOnlyRoute({ children }) {
  const { currentUser, loading } = useAuth()
  const location = useLocation()

  // Wait for Firebase to resolve auth state — avoids a flash of the login page
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <LoadingSpinner label="Checking session…" size="lg" />
      </div>
    )
  }

  // Already logged in — send them to the page they tried to reach,
  // or fall back to /dashboard
  if (currentUser) {
    const destination = location.state?.from?.pathname || '/dashboard'
    return <Navigate to={destination} replace />
  }

  return children
}
