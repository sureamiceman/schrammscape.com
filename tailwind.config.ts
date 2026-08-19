// =============================================================================
// TAILWIND CONFIG — tailwind.config.ts
// =============================================================================
// WHAT THIS FILE DOES:
//   Configures Tailwind CSS, the styling toolkit used throughout this site
//   (it's what powers all the short "className" attributes like "flex",
//   "px-4", "rounded-lg" you'll see in the .tsx files). This file tells
//   Tailwind two things: (1) which files to scan for class names so it
//   knows what styles to generate, and (2) a custom "hunter" green color
//   scale available for use as e.g. bg-hunter-600 or text-hunter-700.
//
// DEPENDS ON:
//   - Nothing else in this project; this is a foundational config file.
//
// USED BY / DEPENDED ON BY:
//   - app/globals.css — the @tailwind lines there pull in styles generated
//     based on the rules in this file.
//   - Every .tsx file under app/ and components/ (as listed in "content"
//     below) — Tailwind scans these for class names in use.
//
// IF YOU CHANGE THIS FILE:
//   - If a new folder of pages or components is added to the project, its
//     file pattern needs to be added to "content" below, or Tailwind won't
//     know to generate styles for classes used inside it.
//   - The "hunter" custom color scale below is a full set of green shades
//     from very light (50) to very dark (950) — currently the site mostly
//     uses the CSS variables in app/globals.css (--hunter, etc.) instead of
//     this Tailwind color scale directly, but it's available if needed.
// =============================================================================

import type { Config } from 'tailwindcss'

const config: Config = {
  // Tells Tailwind exactly which files to scan for class names, so it only
  // generates the CSS actually being used (keeps the final site fast/small).
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // A full brand-green color scale (light to dark), usable via
        // classes like "bg-hunter-600" or "text-hunter-300" if needed.
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
