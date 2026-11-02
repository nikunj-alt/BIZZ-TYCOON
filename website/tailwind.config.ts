import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // GASTECT design-system tokens, exposed to Tailwind utilities.
        surface: '#0A0F1A',
        'surface-elevated': '#111827',
        'surface-overlay': '#1A2238',
        brand: '#00D4C8',
        'brand-dim': '#00A89C',
        'brand-secondary': '#00FFB3',
        accent: '#FF6B35',
        safe: '#00E676',
        warning: '#FFD600',
        danger: '#FF3D00',
        // Chart tiers 1–5 (used for the belt plate rings in the reference
        // component). Ordered from cool/safe to hot/urgent.
        'chart-1': '#00D4C8',
        'chart-2': '#00FFB3',
        'chart-3': '#0080FF',
        'chart-4': '#FFD600',
        'chart-5': '#FF3D00',
      },
      fontFamily: {
        display: ['"Space Grotesk"', '"JetBrains Mono"', 'monospace'],
        body: ['"IBM Plex Sans"', '"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
        xl: '24px',
      },
    },
  },
  plugins: [],
};

export default config;
