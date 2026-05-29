import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        glass: '0 20px 70px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.20)',
        soft: '0 16px 50px rgba(0,0,0,.30)'
      }
    }
  },
  plugins: []
};
export default config;
