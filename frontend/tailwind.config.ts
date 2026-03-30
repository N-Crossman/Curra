import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        black: "#080A09",
        surface: "#141714",
        green: {
          DEFAULT: "#3DDB6F",
          dim: "#2AAD55",
        },
        muted: "#4A5249",
        subtle: "#8A9489",
        foreground: "#E8EDE8",
        border: "#1E221E",
      },
      fontFamily: {
        display: ["Instrument Serif", "Georgia", "serif"],
        sans: ["Geist", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "monospace"],
      },
      borderRadius: {
        DEFAULT: "6px",
      },
      boxShadow: {
        glow: "0 0 0 1px #3DDB6F33",
        "glow-md": "0 0 12px 0 #3DDB6F22",
      },
    },
  },
  plugins: [],
};
export default config;
