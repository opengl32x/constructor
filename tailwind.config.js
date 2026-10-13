/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff1f1',
          100: '#ffe0e0',
          200: '#ffc6c6',
          300: '#ff9c9c',
          400: '#ff6161',
          500: '#e30613',
          600: '#c40510',
          700: '#a0040d',
          800: '#82060f',
          900: '#6b0a12',
        },
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-100%)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '33%': { transform: 'translate3d(40px,-50px,0) scale(1.1)' },
          '66%': { transform: 'translate3d(-30px,30px,0) scale(0.95)' },
        },
        'gradient-shift': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(227,6,19,0.45)' },
          '100%': { boxShadow: '0 0 0 14px rgba(227,6,19,0)' },
        },
        bob: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.22,1,0.36,1) both',
        'fade-in': 'fade-in 0.6s ease-out both',
        'slide-down': 'slide-down 0.6s cubic-bezier(0.22,1,0.36,1) both',
        float: 'float 18s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 6s ease infinite',
        'pulse-ring': 'pulse-ring 1.8s ease-out infinite',
        bob: 'bob 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
