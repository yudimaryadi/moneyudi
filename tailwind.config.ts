import type { Config } from 'tailwindcss'

// Colors read CSS variables (see globals.css) so every existing utility
// (bg-slate-50, text-gray-500, border-red-200, ...) flips with the .dark class.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`
const scale = (prefix: string, steps: number[]) =>
  Object.fromEntries(steps.map((s) => [s, v(`${prefix}-${s}`)]))
const neutral = scale('n', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950])

export default {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        app: v('app'),
        surface: v('surface'),
        slate: neutral,
        gray: neutral,
        red: scale('red', [50, 100, 200, 300, 500, 600, 700, 800]),
        green: scale('green', [50, 100, 200, 600, 700, 800]),
        emerald: scale('emerald', [50, 100, 200, 500, 600, 700, 800]),
        blue: scale('blue', [50, 100, 200, 500, 600, 700, 800]),
        indigo: scale('indigo', [50, 600, 900]),
      },
    },
  },
  plugins: [],
} satisfies Config
