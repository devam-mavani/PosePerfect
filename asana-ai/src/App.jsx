/**
 * App.jsx
 *
 * Root component. Wires up React Router and wraps all pages in the
 * shared Navbar. The router is created in main.jsx using
 * createBrowserRouter so this file stays lean.
 */

import { Outlet, ScrollRestoration } from 'react-router-dom'
import Navbar from './components/Navbar'

export default function App() {
  return (
    <>
      <ScrollRestoration />
      <Navbar />
      {/* Pages render here via <Outlet /> */}
      <Outlet />
    </>
  )
}
