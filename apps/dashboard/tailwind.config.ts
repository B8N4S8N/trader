import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#070b14",
          900: "#0b1120",
          850: "#0f1729",
          800: "#131c31",
          700: "#1c2740",
        },
        accent: {
          DEFAULT: "#38bdf8",
          soft: "#7dd3fc",
        },
        gain: "#34d399",
        loss: "#f87171",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
