/**
 * components/Navbar.jsx
 *
 * Lavender + white navbar with auth state.
 * Logo image loaded from /public/logo.png
 */

import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const NAV_ITEMS = [
  { label: 'Home',      to: '/'          },
  { label: 'Detection', to: '/detection' },
  { label: 'About',     to: '/about'     },
]

function ProfileDropdown({ userProfile, photoURL, onClose, onLogout }) {
  const navigate = useNavigate()
  const ref      = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const initials = [userProfile?.firstName?.[0], userProfile?.lastName?.[0]]
    .filter(Boolean).join('').toUpperCase() || '?'

  return (
    <div
      ref={ref}
      className="absolute right-0 top-[calc(100%+10px)] w-64 bg-white border border-edge
                 rounded-2xl shadow-lift overflow-hidden z-50 animate-fade-up"
    >
      {/* User info header */}
      <div className="px-5 py-4 border-b border-edge bg-surface">
        <div className="flex items-center gap-3">
          {photoURL ? (
            <img src={photoURL} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-lavender flex items-center justify-center
                            text-white font-bold text-sm shrink-0">
              {initials}
            </div>
          )}
          <div className="overflow-hidden">
            <p className="font-display font-bold text-[0.92rem] text-ink truncate">
              {userProfile?.firstName} {userProfile?.lastName}
            </p>
            <p className="text-[0.75rem] text-ink-faint truncate">{userProfile?.email}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-2">
        <button
          onClick={() => { navigate('/profile'); onClose() }}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[0.85rem]
                     font-medium text-ink hover:bg-lavender-pale hover:text-lavender
                     transition-colors duration-150 text-left"
        >
          <span className="text-[1rem]">👤</span> View Profile
        </button>
        <button
          onClick={() => { navigate('/profile?edit=true'); onClose() }}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[0.85rem]
                     font-medium text-ink hover:bg-lavender-pale hover:text-lavender
                     transition-colors duration-150 text-left"
        >
          <span className="text-[1rem]">✏️</span> Edit Details
        </button>
        <hr className="my-1.5 border-edge" />
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[0.85rem]
                     font-medium text-status-bad hover:bg-red-50
                     transition-colors duration-150 text-left"
        >
          <span className="text-[1rem]">🚪</span> Log Out
        </button>
      </div>
    </div>
  )
}

export default function Navbar() {
  const { currentUser, userProfile, logout } = useAuth()
  const navigate  = useNavigate()
  const [open, setOpen] = useState(false)

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

        {/* ── Logo ── */}
        <NavLink to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl overflow-hidden shadow-lavender shrink-0
                          transition-transform duration-300
                          group-hover:rotate-[-8deg] group-hover:scale-110">
            <img
              src="/logo.png"
              alt="PosePerfect logo"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="font-display text-[1.15rem] font-bold text-ink tracking-tight">
            Pose<span className="gradient-text">Perfect</span>
          </span>
        </NavLink>

        {/* Nav links */}
        <nav>
          <ul className="flex items-center gap-1 list-none">
            {NAV_ITEMS.map(({ label, to }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    [
                      'px-4 py-2 rounded-xl text-[0.85rem] font-medium transition-all duration-200',
                      isActive
                        ? 'bg-lavender text-white shadow-lavender font-semibold'
                        : 'text-ink-muted hover:text-lavender hover:bg-lavender-pale',
                    ].join(' ')
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Auth section */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full border border-edge
                           hover:border-lavender-soft hover:bg-lavender-pale transition-all duration-200"
              >
                {userProfile?.photoURL ? (
                  <img
                    src={userProfile.photoURL}
                    alt="avatar"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-lavender flex items-center justify-center
                                  text-white font-bold text-[0.75rem]">
                    {initials}
                  </div>
                )}
                <span className="text-[0.83rem] font-semibold text-ink">
                  {userProfile?.firstName || 'Profile'}
                </span>
                <span className="text-ink-faint text-[0.65rem]">{open ? '▲' : '▼'}</span>
              </button>

              {open && (
                <ProfileDropdown
                  userProfile={userProfile}
                  photoURL={userProfile?.photoURL}
                  onClose={() => setOpen(false)}
                  onLogout={handleLogout}
                />
              )}
            </div>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="px-5 py-2 rounded-xl text-[0.85rem] font-medium text-ink-muted
                           hover:text-lavender hover:bg-lavender-pale transition-all duration-200"
              >
                Log In
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="px-5 py-2 rounded-xl text-[0.85rem] font-semibold text-white
                           bg-lavender hover:bg-lavender-dark shadow-lavender
                           transition-all duration-200 hover:-translate-y-0.5"
              >
                Sign Up
              </button>
            </>
          )}
        </div>

      </div>
    </header>
  )
}
