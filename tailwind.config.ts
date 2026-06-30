import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Brand — single green accent
        brand: {
          DEFAULT: '#0F6E56',
          light: '#1D9E75',
          dark: '#0A4F3E',
        },
        // Semantic tokens — driven by CSS vars so light/dark swap automatically
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          raised: 'rgb(var(--surface-raised) / <alpha-value>)',
          sunken: 'rgb(var(--surface-sunken) / <alpha-value>)',
        },
        content: {
          DEFAULT: 'rgb(var(--text) / <alpha-value>)',
          muted: 'rgb(var(--text-muted) / <alpha-value>)',
          subtle: 'rgb(var(--text-subtle) / <alpha-value>)',
        },
        line: 'rgb(var(--border) / <alpha-value>)',
        success: '#1D9E75',
        warning: '#D9952B',
        danger: '#D9534F',
      },
      fontSize: {
        // Mobile type scale
        'hero': ['3.25rem', { lineHeight: '1', fontWeight: '700', letterSpacing: '-0.03em' }],
        'display': ['2rem', { lineHeight: '2.25rem', fontWeight: '700', letterSpacing: '-0.02em' }],
        'title': ['1.375rem', { lineHeight: '1.75rem', fontWeight: '700', letterSpacing: '-0.01em' }],
        'heading': ['1.0625rem', { lineHeight: '1.5rem', fontWeight: '600' }],
        'body': ['0.9375rem', { lineHeight: '1.4rem' }],
        'caption': ['0.8125rem', { lineHeight: '1.1rem' }],
        'micro': ['0.6875rem', { lineHeight: '0.875rem' }],
      },
      borderRadius: {
        card: '20px',
        sheet: '28px',
        pill: '999px',
      },
      maxWidth: {
        mobile: '420px',
      },
      spacing: {
        'safe-b': 'env(safe-area-inset-bottom)',
        'safe-t': 'env(safe-area-inset-top)',
      },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / 0.04), 0 4px 16px rgb(0 0 0 / 0.04)',
        sheet: '0 -8px 40px rgb(0 0 0 / 0.16)',
        ring: '0 2px 12px rgb(15 110 86 / 0.25)',
      },
      keyframes: {
        'sheet-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'sheet-up': 'sheet-up 0.32s cubic-bezier(0.32, 0.72, 0, 1)',
        'fade-in': 'fade-in 0.25s ease-out',
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [],
}

export default config
