/**
 * main.jsx
 *
 * Application entry point.
 * Defines the route tree and mounts the React app.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import App           from './App'
import Home          from './pages/Home'
import LiveDetection from './pages/LiveDetection'
import About         from './pages/About'

import './styles/index.css'

// ── Route tree ────────────────────────────────────────────────────────────────
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
        element: <LiveDetection />,
      },
      {
        path: 'about',
        element: <About />,
      },
    ],
  },
])

// ── Mount ─────────────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
