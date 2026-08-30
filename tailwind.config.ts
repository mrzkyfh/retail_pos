/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        card: "var(--card)",
        ring: "var(--ring)",
        input: "var(--input)",
        muted: "var(--muted)",
        accent: "var(--accent)",
        border: "var(--border)",
        chart: {
          1: "var(--chart-1)",
          2: "var(--chart-2)",
          3: "var(--chart-3)",
          4: "var(--chart-4)",
          5: "var(--chart-5)",
        },
        popover: "var(--popover)",
        primary: "var(--primary)",
        sidebar: "var(--sidebar)",
        secondary: "var(--secondary)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        destructive: "var(--destructive)",
      },
      textColor: {
        "card-foreground": "var(--card-foreground)",
        "sidebar-ring": "var(--sidebar-ring)",
        "sidebar-accent": "var(--sidebar-accent)",
        "sidebar-border": "var(--sidebar-border)",
        "sidebar-primary": "var(--sidebar-primary)",
        "muted-foreground": "var(--muted-foreground)",
        "accent-foreground": "var(--accent-foreground)",
        "popover-foreground": "var(--popover-foreground)",
        "primary-foreground": "var(--primary-foreground)",
        "sidebar-foreground": "var(--sidebar-foreground)",
        "secondary-foreground": "var(--secondary-foreground)",
        "destructive-foreground": "var(--destructive-foreground)",
      },
      fontFamily: {
        sans: "var(--font-sans)",
        serif: "var(--font-serif)",
        mono: "var(--font-mono)",
      },
      borderRadius: {
        lg: "var(--radius)",
      },
      animation: {
        "collapsible-down": "collapsible-down 300ms cubic-bezier(0.87, 0, 0.13, 1)",
        "collapsible-up": "collapsible-up 300ms cubic-bezier(0.87, 0, 0.13, 1)",
        "fade-in": "fade-in 200ms ease-in-out",
        "fade-out": "fade-out 200ms ease-in-out",
        "slide-down": "slide-down 300ms cubic-bezier(0.32, 0.72, 0.36, 1)",
      },
      keyframes: {
        "collapsible-down": {
          from: {
            opacity: "0",
            height: "0",
            transform: "translateY(-4px)",
          },
          to: {
            opacity: "1",
            height: "var(--radix-collapsible-content-height)",
            transform: "translateY(0)",
          },
        },
        "collapsible-up": {
          from: {
            opacity: "1",
            height: "var(--radix-collapsible-content-height)",
            transform: "translateY(0)",
          },
          to: {
            opacity: "0",
            height: "0",
            transform: "translateY(-4px)",
          },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "slide-down": {
          from: {
            opacity: "0",
            transform: "translateY(-8px)",
          },
          to: {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
      },
    },
  },
  plugins: [],
  darkMode: ["class"],
}

export default config
