import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",

        // Primary - Modern Emerald Green (Clippy's brand)
        primary: {
          DEFAULT: "#10B981",
          foreground: "#FFFFFF",
          50: "#ECFDF5",
          100: "#D1FAE5",
          200: "#A7F3D0",
          300: "#6EE7B7",
          400: "#34D399",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
          800: "#065F46",
          900: "#064E3B",
        },

        // Secondary - Modern Blue
        secondary: {
          DEFAULT: "#5B8DEF",
          foreground: "#FFFFFF",
        },

        // Pastel Palette - Module Identities
        pastel: {
          blue: "#DCEEFF",
          mint: "#DCF8EC",
          lavender: "#EEE6FF",
          peach: "#FFE9DD",
          yellow: "#FFF5D8",
          pink: "#FDE6F3",
          orange: "#FFE8D8",
        },

        // Neutrals
        neutral: {
          50: "#FAFBFC",
          100: "#F4F6F8",
          200: "#E9EDF3",
          300: "#D1D8E0",
          400: "#9BA5B5",
          500: "#6B7280",
          600: "#4B5563",
          700: "#374151",
          800: "#202939",
          900: "#111827",
        },
      },

      fontFamily: {
        dashboard: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        "dashboard-mono": [
          "var(--font-geist-mono)",
          "ui-monospace",
          "monospace",
        ],
      },

      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
        "3xl": "calc(var(--radius) + 12px)",
      },

      animation: {
        float: "float 6s ease-in-out infinite",
        pulse: "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 2s linear infinite",
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        glow: "glow 2s ease-in-out infinite alternate",
      },

      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(16, 185, 129, 0.2)" },
          "100%": { boxShadow: "0 0 20px rgba(16, 185, 129, 0.4)" },
        },
      },

      boxShadow: {
        soft: "0 2px 8px rgba(0, 0, 0, 0.04)",
        medium: "0 4px 16px rgba(0, 0, 0, 0.06)",
        large: "0 8px 32px rgba(0, 0, 0, 0.08)",
        glow: "0 0 20px rgba(16, 185, 129, 0.4)",
      },

      backgroundImage: {
        "gradient-hero":
          "linear-gradient(180deg, #FFFFFF 0%, #EEF4FF 25%, #F4EDFF 50%, #ECFDF5 75%, #FFFFFF 100%)",
        "gradient-ai":
          "linear-gradient(135deg, #DCEEFF 0%, #EEE6FF 50%, #DCF8EC 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
