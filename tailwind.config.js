/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#FFFFFF",
        "bg-subtle": "#FAFAFA",
        text: "#0A0A0A",
        "text-secondary": "#6B6B6B",
        accent: "#f97316",          // برتقالي
        "accent-secondary": "#6366F1",
        "accent-hover": "#ea6a0a",
        border: "#E5E5E5",
        success: "#10B981",
        error: "#EF4444",
        warning: "#F59E0B",
      },
      fontFamily: {
        sans: ["Cairo", "Inter", "system-ui", "sans-serif"],
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [],
};
