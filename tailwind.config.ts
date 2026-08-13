import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'grass': '#2d5016',
        'sage': '#5a7a5a',
        'earth': '#8b7355',
        'sky': '#87ceeb',
      },
    },
  },
  plugins: [],
}
export default config
