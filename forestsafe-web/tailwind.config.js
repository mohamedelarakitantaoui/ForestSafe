/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f2f7f4',
          100: '#e0ece4',
          200: '#c3d9cb',
          300: '#99bfa7',
          400: '#6ca080',
          500: '#4d8563',
          600: '#3b6b4e',
          700: '#315740',
          800: '#2a4636',
          900: '#233a2d',
          950: '#112018',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          500: '#d97706',
          600: '#b45309',
          700: '#92400e',
        },
        caution: {
          50: '#fefce8',
          100: '#fef9c3',
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
        },
        neutral: {
          50: '#f8f8f6',
          100: '#f0f0ec',
          200: '#e2e1dc',
          300: '#cccbc4',
          400: '#a9a79e',
          500: '#8a887f',
          600: '#706e67',
          700: '#5c5a54',
          800: '#4a4944',
          900: '#393836',
          950: '#1d1d1b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
      },
    },
  },
  plugins: [],
};
