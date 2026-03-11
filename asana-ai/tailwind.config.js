/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Plus Jakarta Sans', 'sans-serif'],
        body:    ['DM Sans', 'sans-serif'],
      },
      colors: {
        // Lavender accent scale
        lavender: {
          DEFAULT: '#7C6FCD',
          light:   '#A89FDE',
          dark:    '#5B4FB5',
          pale:    '#F0EEFB',
          soft:    '#E2DEFF',
        },
        // White / near-white surfaces
        surface: {
          DEFAULT: '#FAFAFE',
          mid:     '#F3F1FC',
          dark:    '#E8E5F8',
          card:    '#FFFFFF',
        },
        // Typography — deep purple-tinted neutrals
        ink: {
          DEFAULT: '#1E1B2E',
          muted:   '#6B6589',
          faint:   '#A09BBF',
        },
        // Borders
        edge: '#E2DEFF',
        // Status
        'status-ok':  '#2D7A4E',
        'status-bad': '#B83228',
      },
      boxShadow: {
        card:     '0 1px 4px rgba(100,82,204,0.06), 0 4px 16px rgba(100,82,204,0.05)',
        lift:     '0 4px 24px rgba(100,82,204,0.14), 0 1px 6px rgba(100,82,204,0.08)',
        lavender: '0 4px 20px rgba(124,111,205,0.30)',
        glow:     '0 0 0 3px rgba(124,111,205,0.18)',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: '1',   transform: 'scale(1)'   },
          '50%':      { opacity: '0.5', transform: 'scale(1.3)' },
        },
        spin: {
          to: { transform: 'rotate(360deg)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to:   { opacity: '1', transform: 'translateY(0)'    },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)'  },
          '50%':      { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        pulse:       'pulse 2s infinite',
        spin:        'spin 0.75s linear infinite',
        'spin-slow': 'spin 20s linear infinite',
        'fade-up':   'fadeUp 0.55s cubic-bezier(0.22,1,0.36,1) forwards',
        float:       'float 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
