/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './client/index.html',
    './client/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#e63946',
        accent: '#ffd700',
        background: '#0a0a0f',
        foreground: '#f5f5f5',
        card: '#1a1a28',
        border: '#2a2a3e',
        muted: '#6b6b80',
      },
    },
  },
  plugins: [],
};
