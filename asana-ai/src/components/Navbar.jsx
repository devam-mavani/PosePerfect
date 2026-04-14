/**
 * components/Navbar.jsx — Grey & White theme
 * Updated: shows 🛡️ Admin link in nav + dropdown for mavanidevam30@gmail.com
 */

import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ADMIN_EMAIL = 'mavanidevam30@gmail.com'

const NAV_BASE = [
  { label: 'Home',      to: '/' },
  { label: 'Detection', to: '/detection' },
  { label: 'About',     to: '/about' },
]

const NAV_AUTH = [
  { label: 'Home',      to: '/' },
  { label: 'Schedule',  to: '/schedule' },
  { label: 'Detection', to: '/detection' },
  { label: 'About',     to: '/about' },
]

function ProfileDropdown({ userProfile, isAdmin, onClose, onLogout }) {
  const navigate = useNavigate()
  const ref      = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const initials = [userProfile?.firstName?.[0], userProfile?.lastName?.[0]]
    .filter(Boolean).join('').toUpperCase() || '?'

  const menuItems = [
    { icon: '📅', label: 'My Schedule', path: '/schedule' },
    { icon: '📊', label: 'Dashboard',   path: '/dashboard' },
    { icon: '👤', label: 'View Profile', path: '/profile' },
    ...(isAdmin ? [{ icon: '🛡️', label: 'Admin Panel', path: '/admin' }] : []),
  ]

  return (
    <div ref={ref}
      className="absolute right-0 top-[calc(100%+10px)] w-64 bg-white border border-edge
                 rounded-2xl shadow-lift overflow-hidden z-50 animate-fade-up">
      {/* User header */}
      <div className="px-5 py-4 border-b border-edge bg-surface">
        <div className="flex items-center gap-3">
          {userProfile?.photoURL ? (
            <img src={userProfile.photoURL} alt="avatar"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-brand-soft" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center
                            text-white font-bold text-sm shrink-0">
              {initials}
            </div>
          )}
          <div className="overflow-hidden">
            <div className="flex items-center gap-1.5">
              <p className="font-display font-bold text-[0.92rem] text-ink truncate">
                {userProfile?.firstName} {userProfile?.lastName}
              </p>
              {isAdmin && (
                <span className="text-[0.65rem] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full border border-red-200">
                  ADMIN
                </span>
              )}
            </div>
            <p className="text-[0.75rem] text-ink-faint truncate">{userProfile?.email}</p>
          </div>
        </div>
      </div>

      {/* Menu items */}
      <div className="p-2">
        {menuItems.map(item => (
          <button key={item.path}
            onClick={() => { navigate(item.path); onClose() }}
            className={[
              'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[0.85rem]',
              'font-medium transition-colors duration-150 text-left',
              item.path === '/admin'
                ? 'text-red-600 hover:bg-red-50'
                : 'text-ink-muted hover:bg-brand-pale hover:text-brand',
            ].join(' ')}>
            <span>{item.icon}</span> {item.label}
          </button>
        ))}
        <hr className="my-1.5 border-edge" />
        <button onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[0.85rem]
                     font-medium text-status-bad hover:bg-red-50
                     transition-colors duration-150 text-left">
          <span>🚪</span> Log Out
        </button>
      </div>
    </div>
  )
}

export default function Navbar() {
  const { currentUser, userProfile, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const isAdmin  = currentUser?.email === ADMIN_EMAIL
  const navItems = currentUser ? NAV_AUTH : NAV_BASE

  const initials = [userProfile?.firstName?.[0], userProfile?.lastName?.[0]]
    .filter(Boolean).join('').toUpperCase() || '?'

  async function handleLogout() {
    setOpen(false)
    await logout()
    navigate('/')
  }

  return (
    <header className="fixed top-0 inset-x-0 z-50 glass border-b border-edge">
      <div className="max-w-[1200px] mx-auto flex items-center justify-between px-8 py-4">

        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2.5 group">
          <img
            src="/logo.png"
            alt="PosePerfect logo"
            className="w-8 h-8 object-contain transition-transform duration-300
                       group-hover:scale-110 group-hover:rotate-[-6deg]"
          />
          <span className="font-display text-[1.1rem] font-bold text-ink tracking-tight">
            Pose<span className="gradient-text">Perfect</span>
          </span>
        </NavLink>

        {/* Nav links */}
        <nav>
          <ul className="flex items-center gap-1 list-none">
            {navItems.map(({ label, to }) => (
              <li key={to}>
                <NavLink to={to} end={to === '/'}
                  className={({ isActive }) => [
                    'px-4 py-2 rounded-xl text-[0.85rem] font-medium transition-all duration-200',
                    isActive
                      ? 'bg-brand text-white font-semibold shadow-brand'
                      : 'text-ink-muted hover:text-brand hover:bg-brand-pale',
                  ].join(' ')}>
                  {label}
                </NavLink>
              </li>
            ))}
            {/* Admin pill — only visible to admin */}
            {isAdmin && (
              <li>
                <NavLink to="/admin"
                  className={({ isActive }) => [
                    'px-4 py-2 rounded-xl text-[0.85rem] font-medium transition-all duration-200 flex items-center gap-1',
                    isActive
                      ? 'bg-red-600 text-white font-semibold'
                      : 'text-red-600 hover:bg-red-50 border border-red-200',
                  ].join(' ')}>
                  🛡️ Admin
                </NavLink>
              </li>
            )}
          </ul>
        </nav>

        {/* Auth */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="relative">
              <button onClick={() => setOpen(o => !o)}
                className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full
                           border border-edge hover:border-brand transition-all duration-200
                           hover:bg-brand-pale">
                {userProfile?.photoURL ? (
                  <img src={userProfile.photoURL} alt="avatar"
                    className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center
                                  text-white font-bold text-[0.75rem]">
                    {initials}
                  </div>
                )}
                <span className="text-[0.83rem] font-semibold text-ink">
                  {userProfile?.firstName || 'Profile'}
                </span>
                {isAdmin && (
                  <span className="text-[0.6rem] bg-red-500 text-white font-bold px-1.5 py-0.5 rounded-full">
                    ADMIN
                  </span>
                )}
                <span className="text-ink-faint text-[0.65rem]">{open ? '▲' : '▼'}</span>
              </button>
              {open && (
                <ProfileDropdown
                  userProfile={userProfile}
                  isAdmin={isAdmin}
                  onClose={() => setOpen(false)}
                  onLogout={handleLogout}
                />
              )}
            </div>
          ) : (
            <>
              <button onClick={() => navigate('/login')}
                className="px-5 py-2 rounded-xl text-[0.85rem] font-medium text-ink-muted
                           hover:text-brand hover:bg-brand-pale transition-all duration-200">
                Log In
              </button>
              <button onClick={() => navigate('/signup')}
                className="px-5 py-2 rounded-xl text-[0.85rem] font-semibold text-white
                           bg-brand hover:bg-brand-bright shadow-brand
                           transition-all duration-200 hover:-translate-y-0.5">
                Sign Up
              </button>
            </>
          )}
        </div>

      </div>
    </header>
  )
}
