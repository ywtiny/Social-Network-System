/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                "primary": "#8b8055",
                "primary-hover": "#6f6644",
                "background-light": "#fdfbf7",
                "background-sidebar": "#f5f2eb",
                "surface-light": "#ffffff",
                "border-light": "#e7e5e0",
                "text-main": "#3f3a3a",
                "text-secondary": "#78716c",
                "success": "#5a7c65",
                "warning": "#d9a441",
                "danger": "#c15c5c",
                "graph-bg": "#f9f8f4",
            },
            fontFamily: {
                "display": ["Inter", "Noto Sans SC", "sans-serif"],
                "body": ["Inter", "Noto Sans SC", "sans-serif"],
            },
            borderRadius: {
                "DEFAULT": "0.375rem",
                "lg": "0.5rem",
                "xl": "0.75rem",
                "2xl": "1rem",
                "full": "9999px"
            },
        },
    },
    plugins: [],
}
