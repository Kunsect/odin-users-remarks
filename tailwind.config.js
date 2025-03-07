/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{tsx,html}'],
  theme: {
    extend: {
      colors: {
        primary: '#cc5314',
        'primary-hover': '#df5c16',
        'dark-primary': '#0d0d0d',
        'dark-secondary': '#191919',
        'light-primary': '#dbdbdb',
        'light-secondary': '#5b5b5b',
        background: '#12151e',
        'background-secondary': '#1a1b25',
        'background-tertiary': '#252736',
        'background-card': '#2c3349',
        'background-header': '#222839'
      }
    }
  },
  plugins: []
}
