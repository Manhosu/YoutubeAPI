/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#0f0f0f',
        'secondary': '#1a1a1a',
        'card': '#212121',
        'card-hover': '#2a2a2a',
        'accent': {
          'red': '#ff0000',
          'red-hover': '#cc0000',
        },
        'text': {
          'primary': '#ffffff',
          'secondary': '#aaaaaa',
          'tertiary': '#717171',
        },
        'border': '#303030',
      },
      fontFamily: {
        'roboto': ['Roboto', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 2px rgba(0, 0, 0, 0.2)',
      },
      borderRadius: {
        'card': '8px',
      },
    },
  },
  plugins: [],
} 