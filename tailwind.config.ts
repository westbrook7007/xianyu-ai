import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontSize: {
        caption: ["0.75rem", { lineHeight: "1.5" }],
        body: ["0.875rem", { lineHeight: "1.6" }],
        lead: ["1rem", { lineHeight: "1.6" }],
        title: ["1.125rem", { lineHeight: "1.4" }],
        page: ["1.5rem", { lineHeight: "1.35" }],
        hero: ["1.875rem", { lineHeight: "1.25" }],
      },
      colors: {
        brand: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
        },
      },
    },
  },
  plugins: [],
};

export default config;
