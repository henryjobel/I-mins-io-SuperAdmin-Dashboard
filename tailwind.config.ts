import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#0A7F95",
          soft: "#D9F0F4",
          deep: "#0C5E6D",
        },
        sunset: {
          DEFAULT: "#EA7B32",
          soft: "#FFE8D6",
          deep: "#BA5717",
        },
      },
      fontFamily: {
        heading: ["Space Grotesk", "sans-serif"],
        body: ["Manrope", "sans-serif"],
      },
      keyframes: {
        enter: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        enter: "enter 0.45s ease-out both",
      },
    },
  },
  plugins: [],
} satisfies Config;

