import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'hunter': {
          50: '#f0f4f1',
          100: '#dce5df',
          200: '#b8ccbe',
          300: '#8fab96',
          400: '#6a8e77',
          500: '#4a7361',
          600: '#355e3b',
          700: '#2d4f32',
          800: '#263f2b',
          900: '#1f3223',
          950: '#0e1810',
        },
      },
    },
  },
  plugins: [],
}
export default config
