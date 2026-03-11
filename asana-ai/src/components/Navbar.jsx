/**
 * components/Navbar.jsx
 *
 * Bear-inspired top navigation: warm paper background, rust accent, serif logo.
 */

import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { label: 'Home',      to: '/'          },
  { label: 'Detection', to: '/detection' },
  { label: 'About',     to: '/about'     },
]

export default function Navbar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-paper/90 backdrop-blur-md border-b border-warm">
      <div className="max-w-[1200px] mx-auto flex items-center justify-between px-8 py-4">
        {/* Logo — Bear-style: emoji icon + serif wordmark */}
        <NavLink to="/" className="flex items-center gap-2.5 group">
          <span className="text-[1.3rem] select-none transition-transform duration-300 group-hover:rotate-[-8deg]">
            🧘
          </span>
          <span className="font-display text-[1.2rem] font-semibold text-ink tracking-tight">
            Pose<span className="text-bear">Perfect</span>
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
                      'px-4 py-2 rounded-lg text-[0.85rem] font-medium transition-all duration-200',
                      isActive
                        ? 'bg-bear-pale text-bear font-semibold'
                        : 'text-ink-muted hover:text-ink hover:bg-paper-mid',
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
