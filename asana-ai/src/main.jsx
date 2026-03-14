/**
 * main.jsx
 *
 * Application entry point.
 * Defines the full route tree including auth pages and protected routes.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import App             from './App'
import Home            from './pages/Home'
import LiveDetection   from './pages/LiveDetection'
import About           from './pages/About'
import Login           from './pages/Login'
import SignUp          from './pages/SignUp'
import CompleteProfile from './pages/CompleteProfile'
import Profile         from './pages/Profile'
import ProtectedRoute  from './components/ProtectedRoute'

import './styles/index.css'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'detection',
        element: (
          <ProtectedRoute>
            <LiveDetection />
          </ProtectedRoute>
        ),
      },
      {
        path: 'about',
        element: <About />,
      },
      {
        path: 'login',
        element: <Login />,
      },
      {
        path: 'signup',
        element: <SignUp />,
      },
      {
        path: 'complete-profile',
        element: (
          <ProtectedRoute>
            <CompleteProfile />
          </ProtectedRoute>
        ),
      },
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        ),
      },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
