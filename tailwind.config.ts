import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        fairway: {
          50: "#f0f9f0",
          100: "#dcf0dc",
          200: "#b8e0ba",
          300: "#8cca8f",
          400: "#5bab60",
          500: "#3d8c43",
          600: "#2d6f33",
          700: "#25592a",
          800: "#204724",
          900: "#1b3b1f",
        },
        sand: {
          50: "#fbf8f1",
          100: "#f4ecd8",
          200: "#e8d7ac",
          300: "#dcc07e",
        },
      },
    },
  },
  plugins: [],
};
export default config;
