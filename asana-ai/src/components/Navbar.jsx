/**
 * components/Navbar.jsx
 *
 * Lavender + white navbar — glass effect, soft lavender active states.
 */

import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { label: 'Home',      to: '/'          },
  { label: 'Detection', to: '/detection' },
  { label: 'About',     to: '/about'     },
]

export default function Navbar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 glass border-b border-edge">
      <div className="max-w-[1200px] mx-auto flex items-center justify-between px-8 py-4">

        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-lavender flex items-center justify-center shadow-lavender
                          transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:scale-110">
            <span className="text-white text-[0.85rem]">🧘</span>
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
      </div>
    </header>
  )
}
