/**
 * components/ProtectedRoute.jsx
 *
 * Updated: allows existing onboarded users to revisit /onboarding
 * when ?redo=true is in the URL (for schedule regeneration).
 */

import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from './LoadingSpinner'

export default function ProtectedRoute({ children }) {
  const { currentUser, loading, isOnboardingDone } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <LoadingSpinner label="Checking session…" size="lg" />
      </div>
    )
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Allow onboarded users through to /onboarding when ?redo=true
  const isRedoMode = location.pathname === '/onboarding' &&
    new URLSearchParams(location.search).get('redo') === 'true'

  // Redirect to onboarding only if not done yet (and not already going there)
  if (
    !isOnboardingDone &&
    !isRedoMode &&
    location.pathname !== '/onboarding' &&
    location.pathname !== '/complete-profile'
  ) {
    return <Navigate to="/onboarding" replace />
  }

  return children
}
