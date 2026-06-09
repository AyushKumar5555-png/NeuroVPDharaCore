/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#060e12',
        accentGreen: '#00e676',
        textMuted: '#80cbc4',
        textMain: '#e0f2f1',
      }
    },
  },
  plugins: [],
}
