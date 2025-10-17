/** @type {import('tailwindcss').Config} */
import { fontFamily } from 'tailwindcss/defaultTheme';
import colors from 'tailwindcss/colors';
import typography from '@tailwindcss/typography';

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class', // Enable dark mode
  theme: {
    extend: {
      colors: {
        neutral: colors.zinc, // Using zinc for better light/dark contrast
        primary: colors.blue, // Using blue for a cleaner primary color
      },
      fontFamily: {
        sans: ['Inter', ...fontFamily.sans], // Add 'Inter' font
      },
      screens: {
        xsm: "500px",
      },
    },
  },
  plugins: [
    typography, // Add plugin for blog post styling
  ],
};