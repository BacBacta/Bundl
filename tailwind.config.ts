import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0F6E56',
          light: '#1a9470',
          dark: '#0a4f3e',
        },
      },
      maxWidth: {
        mobile: '390px',
      },
    },
  },
  plugins: [],
}

export default config
