/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Lora', 'Georgia', 'serif'],
        body:    ['DM Sans', 'sans-serif'],
      },
      colors: {
        // Bear-inspired rust / red accent
        bear: {
          DEFAULT: '#C8432A',
          light:   '#E06B50',
          dark:    '#9A3120',
          pale:    '#F9EDE9',
        },
        // Warm cream / parchment surfaces
        paper: {
          DEFAULT: '#FAF7F2',
          mid:     '#F3EDE3',
          dark:    '#E9E0D1',
          card:    '#FFFFFF',
        },
        // Typography
        ink: {
          DEFAULT: '#1C1917',
          muted:   '#78716C',
          faint:   '#A8A29E',
        },
        // Borders / dividers
        warm: '#DED5C7',
        // Status
        'status-ok':  '#2D7A4E',
        'status-bad': '#B83228',
      },
      boxShadow: {
        card:  '0 1px 4px rgba(28,25,23,0.06), 0 4px 16px rgba(28,25,23,0.04)',
        lift:  '0 4px 20px rgba(28,25,23,0.10), 0 1px 6px rgba(28,25,23,0.06)',
        bear:  '0 4px 16px rgba(200,67,42,0.22)',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%':       { opacity: '0.5', transform: 'scale(1.3)' },
        },
        spin: {
          to: { transform: 'rotate(360deg)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        pulse:       'pulse 2s infinite',
        spin:        'spin 0.75s linear infinite',
        'spin-slow': 'spin 20s linear infinite',
        'fade-up':   'fadeUp 0.55s cubic-bezier(0.22,1,0.36,1) forwards',
        shimmer:     'shimmer 2.2s ease infinite',
      },
    },
  },
  plugins: [],
}
