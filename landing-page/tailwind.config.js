/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // LYNQ Brand Colors: White, Blue, Green
        white: {
          DEFAULT: "#ffffff",
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#e5e5e5",
        },
        blue: {
          950: "#0a1628",
          900: "#0f1e3a",
          800: "#1e3a5f",
          700: "#2563eb", // Primary blue
          600: "#3b82f6",
          500: "#60a5fa",
          400: "#93c5fd",
          300: "#bfdbfe",
          200: "#dbeafe",
          100: "#eff6ff",
          50: "#f0f9ff",
        },
        green: {
          700: "#10b981", // Primary green (matching LYNQ logo)
          600: "#34d399",
          500: "#6ee7b7",
          400: "#a7f3d0",
          300: "#d1fae5",
          200: "#ecfdf5",
          100: "#f0fdf4",
        },
        primary: "#2563eb", // Blue
        secondary: "#10b981", // Green
      },
      fontFamily: {
        inter: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
