/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,ts}',
  ],
  important: true,
  theme: {
    extend: {
      colors: {
        brand: {
          green:  '#16a34a',
          light:  '#dcfce7',
          purple: '#667eea',
          deep:   '#764ba2',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 4px 20px rgba(0,0,0,0.08)',
        hero: '0 8px 32px rgba(22,163,74,0.18)',
      },
    },
  },
  plugins: [],
}

