/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        rp: {
          bg: '#ffffff',
          'bg-soft': '#f6f8fc',
          card: '#ffffff',
          text: '#12213f',
          muted: '#5f6f86',
          border: '#dfe6f1',
          primary: '#2b63f5',
          'primary-hover': '#1f52da',
          purple: '#7445d8',
          success: '#0d9f6e',
          warning: '#d78300',
          danger: '#d6455d',
        },
      },
      fontFamily: {
        heading: ['Space Grotesk', 'system-ui', 'sans-serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}