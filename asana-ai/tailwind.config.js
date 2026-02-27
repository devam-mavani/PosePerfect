/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      colors: {
        sage: {
          DEFAULT: '#6b9e78',
          light:   '#a8c5b0',
          dark:    '#3d6647',
        },
        earth: {
          DEFAULT: '#c4a882',
          light:   '#e8d9c4',
        },
        charcoal: {
          DEFAULT: '#1c1f1e',
          mid:     '#2a2e2c',
          soft:    '#363b38',
        },
        'off-white': '#f4f1eb',
        'warm-white': '#faf8f4',
        muted: '#8a9490',
        'red-posture':   '#d4685a',
        'green-posture': '#5a9e6f',
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
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        pulse:   'pulse 2s infinite',
        spin:    'spin 0.8s linear infinite',
        'spin-slow': 'spin 20s linear infinite',
        'fade-up': 'fadeUp 0.5s ease forwards',
      },
    },
  },
  plugins: [],
}
