/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        paper: 'rgb(var(--color-paper) / <alpha-value>)',
        mint: 'rgb(var(--color-mint) / <alpha-value>)',
        coral: 'rgb(var(--color-coral) / <alpha-value>)',
        arc: 'rgb(var(--color-arc) / <alpha-value>)',
        violet: 'rgb(var(--color-violet) / <alpha-value>)',
        night: 'rgb(var(--color-night) / <alpha-value>)',
        haze: 'rgb(var(--color-haze) / <alpha-value>)'
      },
      boxShadow: {
        panel: '0 24px 70px rgb(var(--shadow-panel) / 0.12)',
        glow: '0 28px 90px rgb(var(--color-arc) / 0.24)'
      }
    }
  },
  plugins: []
}
