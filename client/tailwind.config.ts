import type { Config } from 'tailwindcss';

// discord-matching dark theme colors + their status colors
// grabbed these from discord's css, they use em everywhere
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        discord: {
          bg: '#313338',        // main background
          secondary: '#2b2d31', // slightly darker panels
          tertiary: '#1e1f22',  // darkest bg (sidebars, cards)
          green: '#57F287',     // success / completed
          red: '#ED4245',       // error / dnf
          yellow: '#FEE75C',    // warning / in-progress
          blurple: '#5865F2',   // discord brand color, used for primary buttons
        },
      },
      fontFamily: {
        // discord uses "gg sans" as their main font
        sans: ['gg sans', 'Noto Sans', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
