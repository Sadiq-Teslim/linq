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
        // Legacy support (mapped to new colors)
        navy: {
          950: "#0a1628",
          900: "#0f1e3a",
          800: "#1e3a5f",
          700: "#2563eb",
          600: "#3b82f6",
          500: "#60a5fa",
          400: "#93c5fd",
          300: "#bfdbfe",
          200: "#dbeafe",
          100: "#eff6ff",
        },
        gold: {
          500: "#10b981", // Map gold to green
          400: "#34d399",
          300: "#6ee7b7",
        },
        primary: "#2563eb", // Blue
        secondary: "#10b981", // Green
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        serif: ["DM Serif Display", "serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out forwards",
        "fade-in-up": "fadeInUp 0.4s ease-out forwards",
        "scale-in": "scaleIn 0.2s ease-out forwards",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(100%)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(37, 99, 235, 0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(37, 99, 235, 0.5)" },
        },
        pulseGlowGreen: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(16, 185, 129, 0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(16, 185, 129, 0.5)" },
        },
      },
      boxShadow: {
        soft: "0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)",
        "glow-blue": "0 0 20px rgba(37, 99, 235, 0.3)",
        "glow-green": "0 0 20px rgba(16, 185, 129, 0.3)",
        "glow-gold": "0 0 20px rgba(16, 185, 129, 0.3)", // Map to green
      },
    },
  },
  plugins: [],
};
