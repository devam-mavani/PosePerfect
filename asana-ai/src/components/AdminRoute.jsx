/**
 * components/AdminRoute.jsx
 *
 * Route guard that only allows mavanidevam30@gmail.com through.
 * Anyone else gets redirected to the home page silently.
 */

import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from './LoadingSpinner'

const ADMIN_EMAIL = 'mavanidevam30@gmail.com'

export default function AdminRoute({ children }) {
  const { currentUser, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <LoadingSpinner label="Checking access…" size="lg" />
      </div>
    )
  }

  if (!currentUser || currentUser.email !== ADMIN_EMAIL) {
    return <Navigate to="/" replace />
  }

  return children
}
