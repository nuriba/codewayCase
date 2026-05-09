/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0f1024',
          800: '#161830',
          700: '#1a1b2e',
          600: '#22243e',
          500: '#2a2c4a',
          400: '#383a5e',
        },
        coral: { 500: '#ef4d5b' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
