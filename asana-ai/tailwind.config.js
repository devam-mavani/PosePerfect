/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand:          '#1F2937',
        'brand-bright': '#111827',
        'brand-muted':  '#374151',
        'brand-pale':   '#F9FAFB',
        'brand-soft':   '#E5E7EB',
        lavender:          '#7C6FCD',
        'lavender-dark':   '#6458B4',
        'lavender-pale':   '#F0EEFF',
        'lavender-soft':   '#D4CFFF',
        bg:             '#FFFFFF',
        surface:        '#F9FAFB',
        'surface-mid':  '#F3F4F6',
        'surface-dark': '#E5E7EB',
        edge:           '#E5E7EB',
        ink:            '#111827',
        'ink-muted':    '#6B7280',
        'ink-faint':    '#9CA3AF',
        'status-ok':    '#16A34A',
        'status-bad':   '#DC2626',
      },
      fontFamily: {
        display: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        sans:    ['DM Sans', 'system-ui', 'sans-serif'],
        body:    ['DM Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card:       '0 1px 8px rgba(0,0,0,0.06)',
        brand:      '0 4px 16px rgba(31,41,55,0.12)',
        lift:       '0 8px 32px rgba(0,0,0,0.10)',
        'brand-lg': '0 8px 32px rgba(31,41,55,0.18)',
        lavender:   '0 4px 16px rgba(124,111,205,0.30)',
      },
      animation: {
        'fade-up':  'fade-up 0.35s ease both',
        'fade-in':  'fade-in 0.25s ease both',
        'float':    'float 3s ease-in-out infinite',
        'shimmer':  'shimmer 2.5s linear infinite',
      },
    },
  },
  plugins: [],
}
