/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        frutiger: [
          'Frutiger',
          'Inter',
          'system-ui',
          'Avenir',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        // fallback to system fonts if Frutiger is not available
      },
      borderRadius: {
        'xl': '1.5rem',
        '2xl': '2rem',
      },
      boxShadow: {
        'widget': '0 4px 32px 0 rgba(0,0,0,0.12)',
      },
    },
  },
  darkMode: 'class',
  plugins: [],
}
