/**
 * components/Navbar.jsx
 *
 * Fixed top navigation bar.
 * Uses React Router <NavLink> so the active link is styled automatically.
 */

import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { label: 'Home',      to: '/'          },
  { label: 'Detection', to: '/detection' },
  { label: 'About',     to: '/about'     },
]

export default function Navbar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-8 py-5 bg-charcoal/85 backdrop-blur-xl border-b border-sage/10">
      {/* Logo */}
      <NavLink to="/" className="font-display text-[1.35rem] font-extrabold tracking-tight text-off-white">
        Asana<span className="text-sage">AI</span>
      </NavLink>

      {/* Links */}
      <nav>
        <ul className="flex items-center gap-8 list-none">
          {NAV_ITEMS.map(({ label, to }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  [
                    'text-[0.8rem] font-medium tracking-widest uppercase transition-colors duration-200',
                    isActive ? 'text-sage-light' : 'text-muted hover:text-sage-light',
                  ].join(' ')
                }
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
