import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        discord: {
          bg: '#313338',
          secondary: '#2b2d31',
          tertiary: '#1e1f22',
          green: '#57F287',
          red: '#ED4245',
          yellow: '#FEE75C',
          blurple: '#5865F2',
        },
      },
      fontFamily: {
        sans: ['gg sans', 'Noto Sans', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
