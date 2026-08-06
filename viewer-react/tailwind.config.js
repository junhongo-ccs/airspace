/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          'future-blue': '#0F6FC6',
          'navy': '#0B1E2D',
          'black': '#000000',
          'white': '#FFFFFF',
          'blue-light': '#3E9BE0',
          'blue-mid': '#0F6FC6',
          'blue-dark': '#0B3D75',
          'cyan': '#00D2E6',
          'green': '#3FD35F',
          'yellow': '#FFD400',
          'orange': '#FF8A00',
          'red': '#E8380D',
        },
        bg: {
          'app': '#F4F6F8',
          'panel': '#FFFFFF',
          'table-head': '#EAEEF2',
        },
        text: {
          'primary': '#0B1E2D',
          'secondary': '#5A6B78',
        },
        action: {
          'primary': '#0F6FC6',
        },
        map: {
          'route': '#0B3D75',
          'route-draft': '#3E9BE0',
          'caution': '#FF8A00',
          'prohibited': '#E8380D',
          'building': '#8A96A0',
          'terrain-high': '#8C6239',
          'unknown': '#FFD400',
        },
        status: {
          'ok': '#3FD35F',
          'warn': '#FF8A00',
          'error': '#E8380D',
          'idle': '#8A96A0',
        },
      },
    },
  },
  plugins: [],
}
