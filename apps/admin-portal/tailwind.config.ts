import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        saffron: "#f08f21",
        ocean: "#0f2f4f"
      }
    }
  },
  plugins: []
};

export default config;
