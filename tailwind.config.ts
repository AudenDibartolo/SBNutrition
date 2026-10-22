import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Stony Brook red
        brand: { 50: "#fdf2f3", 100: "#fbe3e5", 500: "#c8102e", 600: "#990000", 700: "#7a0000" },
      },
    },
  },
  plugins: [],
} satisfies Config;
