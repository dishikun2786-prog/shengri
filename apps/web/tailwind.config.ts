import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf4f0',
          100: '#fbe5db',
          200: '#f7c8b5',
          300: '#f0a485',
          400: '#e77a54',
          500: '#dc5a2e',
          600: '#c44520',
          700: '#a3371c',
          800: '#842f1d',
          900: '#6d2a1c',
        },
        gold: {
          50: '#fdfae8',
          100: '#fbf3c4',
          200: '#f8e68c',
          300: '#f3d24a',
          400: '#ecbe1c',
          500: '#dca310',
          600: '#be7e0a',
          700: '#985b0c',
          800: '#7d4812',
          900: '#6a3b15',
        },
        ink: {
          50: '#f6f5f3',
          100: '#eae8e3',
          200: '#d5d1c9',
          300: '#bab4a8',
          400: '#9e9586',
          500: '#8b806f',
          600: '#776c5d',
          700: '#61584d',
          800: '#524b42',
          900: '#47413a',
          950: '#2d251e',
        },
        wx: {
          wood: '#22c55e',
          fire: '#ef4444',
          earth: '#f59e0b',
          metal: '#eab308',
          water: '#3b82f6',
        },
        chart: {
          bg: '#2a2018',
          surface: '#3a2e22',
          border: '#5a4a3a',
          text: '#e8ddd3',
          muted: '#9e8e7e',
          accent: '#d4a84b',
        },
      },
      fontFamily: {
        kai: ['"ZCOOL XiaoWei"', '"楷体"', 'KaiTi', '"STKaiti"', 'serif'],
        song: ['"宋体"', 'SimSun', '"STSong"', 'serif'],
        display: ['"Ma Shan Zheng"', '"ZCOOL XiaoWei"', '"楷体"', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
