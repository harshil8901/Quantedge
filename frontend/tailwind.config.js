/** @type {import('tailwindcss').Config} */
const config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Geist', 'Satoshi', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: '#050816',
        surface: '#101725',
        surfaceSecondary: '#070B14',
        primary: '#4F8CFF',
        emerald: '#00C896',
        gold: '#F5B942',
        critical: '#FF5D5D',
        muted: '#A1AAB8',
      },
      boxShadow: {
        glow: '0 30px 80px rgba(79,140,255,0.14)',
        soft: '0 16px 48px rgba(0,0,0,0.24)',
      },
    },
  },
  plugins: [],
};

export default config;
