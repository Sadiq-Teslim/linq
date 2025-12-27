/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0052cc', // Trust Blue
        secondary: '#ff9900', // Action Orange
        bg: '#f8fafc',      // Light Background
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Optional: Add if you want a clean font
      }
    },
  },
  plugins: [],
}