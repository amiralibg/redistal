/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Modern brand colors - inspired by Redis red with a modern twist
        brand: {
          50: "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          300: "#fca5a5",
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
          800: "#991b1b",
          900: "#7f1d1d",
          950: "#450a0a",
        },
        // Neutral grays with better dark mode support
        neutral: {
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
          950: "#0a0a0a",
        },
        // Accent colors for UI elements
        accent: {
          blue: {
            light: "#3b82f6",
            dark: "#60a5fa",
          },
          green: {
            light: "#10b981",
            dark: "#34d399",
          },
          yellow: {
            light: "#f59e0b",
            dark: "#fbbf24",
          },
          red: {
            light: "#ef4444",
            dark: "#f87171",
          },
        },
        // Semantic colors
        success: {
          light: "#10b981",
          dark: "#34d399",
        },
        warning: {
          light: "#f59e0b",
          dark: "#fbbf24",
        },
        error: {
          light: "#ef4444",
          dark: "#f87171",
        },
        info: {
          light: "#3b82f6",
          dark: "#60a5fa",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "Monaco",
          "Courier New",
          "monospace",
        ],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        soft: "0 2px 8px rgba(0, 0, 0, 0.05)",
        "soft-lg": "0 4px 16px rgba(0, 0, 0, 0.08)",
        "soft-xl": "0 8px 32px rgba(0, 0, 0, 0.12)",
        "inner-soft": "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      transitionDuration: {
        400: "400ms",
      },
    },
  },
  plugins: [],
};
