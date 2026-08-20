import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0A0B14',
          card: '#12142A',
          surface: '#1A1D3A',
          border: '#252849',
          accent: '#6C63FF',
          cyan: '#00D4FF',
          gold: '#FFB627',
          success: '#00E676',
          error: '#FF5252',
          text: {
            primary: '#FFFFFF',
            secondary: '#A0A3BD',
            muted: '#6B6E8A',
          }
        }
      }
    },
  },
  plugins: [],
};
export default config;
