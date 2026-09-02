/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        vybe: {
          lime: '#CCFF00',
          citrus: '#FF5500',
          violet: '#8A2BE2',
          electric: '#7928CA',
          cyan: '#00F0FF',
          pink: '#FF007F',
          yellow: '#FFDE59',
          dark: {
            bg: '#090A0F',
            card: '#13151F',
            surface: '#1A1D2B',
            border: '#272B3F',
            muted: '#8E94A8'
          },
          light: {
            bg: '#F6F7FB',
            card: '#FFFFFF',
            surface: '#EEF1F8',
            border: '#E2E6F0',
            muted: '#636A84'
          }
        }
      },
      fontFamily: {
        display: ['"Syne"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', '"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float-slow': 'float 6s ease-in-out infinite',
        'float-fast': 'float 3.5s ease-in-out infinite',
        'spin-slow': 'spin 12s linear infinite',
        'gradient-x': 'gradient-x 6s ease infinite',
        'marquee': 'marquee 25s linear infinite',
        'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-12px) rotate(2deg)' },
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        }
      },
      boxShadow: {
        'neon-lime': '0 0 25px rgba(204, 255, 0, 0.45)',
        'neon-citrus': '0 0 25px rgba(255, 85, 0, 0.45)',
        'neon-violet': '0 0 25px rgba(138, 43, 226, 0.45)',
        'neon-cyan': '0 0 25px rgba(0, 240, 255, 0.45)',
        'neon-pink': '0 0 25px rgba(255, 0, 127, 0.45)',
        'card-glow': '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
      }
    },
  },
  plugins: [],
}

