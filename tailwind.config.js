/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./script.js", "./*.js"],
  safelist: [
    "ring-emerald-500",
    "ring-teal-400",
    "ring-blue-500",
    "ring-amber-500",
    "ring-red-500",
    "ring-purple-500",
    "ring-slate-400",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "sans-serif"],
      },
      colors: {
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          500: "#10b981",
          600: "#059669",
          900: "#064e3b",
        },
        dark: {
          bg: "#0f172a",
          card: "#1e293b",
          text: "#f1f5f9",
        },
      },
      animation: {
        "slide-up": "slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fadeIn 0.3s ease-out",
        blob: "blob 10s infinite alternate",
        "spin-slow": "spin 3s linear infinite",
      },
      keyframes: {
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: 0 },
          "100%": { transform: "translateY(0)", opacity: 1 },
        },
        fadeIn: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        blob: {
          "0%": { transform: "translate(0, 0) scale(1)" },
          "100%": { transform: "translate(20px, -20px) scale(1.1)" },
        },
      },
    },
  },
  plugins: [],
};
