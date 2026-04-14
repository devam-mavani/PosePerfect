/**
 * main.jsx — Updated with admin route.
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
import Dashboard       from './pages/Dashboard'
import Onboarding      from './pages/Onboarding'
import Schedule        from './pages/Schedule'
import SessionPlayer   from './pages/SessionPlayer'
import Admin           from './pages/Admin'
import ProtectedRoute  from './components/ProtectedRoute'
import AdminRoute      from './components/AdminRoute'

import './styles/index.css'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'about',  element: <About /> },
      { path: 'login',  element: <Login /> },
      { path: 'signup', element: <SignUp /> },
      {
        path: 'detection',
        element: <ProtectedRoute><LiveDetection /></ProtectedRoute>,
      },
      {
        path: 'onboarding',
        element: <ProtectedRoute><Onboarding /></ProtectedRoute>,
      },
      {
        path: 'schedule',
        element: <ProtectedRoute><Schedule /></ProtectedRoute>,
      },
      {
        path: 'session',
        element: <ProtectedRoute><SessionPlayer /></ProtectedRoute>,
      },
      {
        path: 'dashboard',
        element: <ProtectedRoute><Dashboard /></ProtectedRoute>,
      },
      {
        path: 'complete-profile',
        element: <ProtectedRoute><CompleteProfile /></ProtectedRoute>,
      },
      {
        path: 'profile',
        element: <ProtectedRoute><Profile /></ProtectedRoute>,
      },
      {
        // Admin route — only mavanidevam30@gmail.com can access
        path: 'admin',
        element: <AdminRoute><Admin /></AdminRoute>,
      },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
