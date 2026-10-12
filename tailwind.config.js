/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/admin-reference/**/*.{js,jsx,ts,tsx}'],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        cyan: {
          50: '#f1f7fd', 100: '#e1edf9', 200: '#c7ddf3', 300: '#a2c5e8',
          400: '#78b5f5', 500: '#4e91d0', 600: '#3574b2', 700: '#285c91',
          800: '#204a75', 900: '#1c3d60', 950: '#10253d',
        },
      },
    },
  },
  plugins: [],
};
