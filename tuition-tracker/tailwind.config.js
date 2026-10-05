/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/context/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        nav: 'lab(var(--nav-raw) / <alpha-value>)',
        navBorder: 'lab(var(--nav-border-raw) / <alpha-value>)',
        background: 'lab(var(--background-raw) / <alpha-value>)',
        foreground: 'lab(var(--foreground-raw) / <alpha-value>)',
        card: 'lab(var(--card-raw) / <alpha-value>)',
        card2: 'lab(var(--card2-raw) / <alpha-value>)',
        border: 'lab(var(--border-raw) / <alpha-value>)',
        muted: 'lab(var(--muted-foreground-raw) / <alpha-value>)',
        'primary-foreground': 'lab(var(--primary-foreground-raw) / <alpha-value>)',
        accent: '#6366f1',
        accent2: 'lab(var(--accent2-raw) / <alpha-value>)',
        green: 'lab(var(--green-raw) / <alpha-value>)',
        red: 'lab(var(--red-raw) / <alpha-value>)',
        amber: 'lab(var(--amber-raw) / <alpha-value>)',
      },
      backgroundColor: {
        base: 'var(--background)',
      },
      fontSize: {
        xs: ['13px', { lineHeight: '1.4' }],
      },
      fontFamily: {
        sans: ['"Geist Fallback"', 'ui-sans-serif', 'system-ui', '"Segoe UI"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};