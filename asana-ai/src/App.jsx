/**
 * App.jsx
 *
 * Root component. Wraps everything in AuthProvider and renders
 * the shared Navbar above all pages via <Outlet />.
 */

import { Outlet, ScrollRestoration } from 'react-router-dom'
import Navbar from './components/Navbar'
import { AuthProvider } from './contexts/AuthContext'

export default function App() {
  return (
    <AuthProvider>
      <ScrollRestoration />
      <Navbar />
      <Outlet />
    </AuthProvider>
  )
}
