import type { Config } from 'tailwindcss'

const config: Config = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                // UPGRADE Brand — Neon Yellow
                neon: {
                    yellow: '#FFD600',
                    cyan: '#00F5FF',
                    green: '#00FF8A',
                    red: '#FF2D55',
                    purple: '#BF5AF2',
                    orange: '#FF9F0A',
                },
                bg: {
                    base: '#050508',
                    surface: '#0a0a12',
                    card: '#0f0f1a',
                    elevated: '#141420',
                },
                // Legacy aliases — kept for backward compat
                primary: {
                    50: '#fffde7',
                    100: '#fff9c4',
                    200: '#fff59d',
                    300: '#fff176',
                    400: '#ffee58',
                    500: '#FFD600',
                    600: '#fdd835',
                    700: '#f9a825',
                    800: '#f57f17',
                    900: '#e65100',
                },
                accent: {
                    50: '#e0faff',
                    100: '#b3f5ff',
                    200: '#80f0ff',
                    300: '#4debff',
                    400: '#26e8ff',
                    500: '#00F5FF',
                    600: '#00bcd4',
                    700: '#0097a7',
                    800: '#00838f',
                    900: '#006064',
                },
                neutral: {
                    50: '#f0f0ff',
                    100: '#e0e0f0',
                    200: '#c0c0d0',
                    300: '#a0a0b0',
                    400: '#808090',
                    500: '#606070',
                    600: '#404050',
                    700: '#303040',
                    800: '#1a1a28',
                    900: '#0f0f1a',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                orbitron: ['Orbitron', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            animation: {
                'float': 'float 4s ease-in-out infinite',
                'neon-pulse': 'neonPulse 2.5s ease-in-out infinite',
                'neon-text': 'neonTextPulse 2.5s ease-in-out infinite',
                'scan-line': 'scanLine 8s linear infinite',
                'blob-move': 'blobMove 12s ease-in-out infinite',
                'count-up': 'countUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
                'shimmer': 'shimmer 2.5s infinite',
                'spin-slow': 'spinnerRotate 3s linear infinite',
                'glow-border': 'glowBorder 3s ease-in-out infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-8px)' },
                },
                neonPulse: {
                    '0%, 100%': { boxShadow: '0 0 8px rgba(255,214,0,0.4), 0 0 20px rgba(255,214,0,0.15)' },
                    '50%': { boxShadow: '0 0 20px rgba(255,214,0,0.4), 0 0 50px rgba(255,214,0,0.15), 0 0 80px rgba(255,214,0,0.05)' },
                },
                neonTextPulse: {
                    '0%, 100%': { textShadow: '0 0 8px rgba(255,214,0,0.4)' },
                    '50%': { textShadow: '0 0 20px rgba(255,214,0,0.4), 0 0 40px rgba(255,214,0,0.15)' },
                },
                scanLine: {
                    '0%': { transform: 'translateY(-100%)', opacity: '0' },
                    '10%': { opacity: '0.5' },
                    '90%': { opacity: '0.5' },
                    '100%': { transform: 'translateY(100vh)', opacity: '0' },
                },
                blobMove: {
                    '0%, 100%': { borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%', transform: 'translate(0,0) scale(1)' },
                    '33%': { borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%', transform: 'translate(20px,-10px) scale(1.05)' },
                    '66%': { borderRadius: '20% 60% 40% 80% / 70% 30% 60% 40%', transform: 'translate(-10px, 15px) scale(0.95)' },
                },
                countUp: {
                    from: { opacity: '0', transform: 'translateY(10px)', filter: 'blur(4px)' },
                    to: { opacity: '1', transform: 'translateY(0)', filter: 'blur(0)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% center' },
                    '100%': { backgroundPosition: '200% center' },
                },
                spinnerRotate: {
                    to: { transform: 'rotate(360deg)' },
                },
                glowBorder: {
                    '0%, 100%': { borderColor: 'rgba(255,214,0,0.18)' },
                    '50%': { borderColor: '#FFD600', boxShadow: '0 0 15px rgba(255,214,0,0.15)' },
                },
            },
            boxShadow: {
                'neon-yellow': '0 0 16px rgba(255,214,0,0.4), 0 0 40px rgba(255,214,0,0.15)',
                'neon-cyan': '0 0 16px rgba(0,245,255,0.4), 0 0 40px rgba(0,245,255,0.15)',
                'neon-green': '0 0 16px rgba(0,255,138,0.4), 0 0 40px rgba(0,255,138,0.15)',
                'neon-red': '0 0 16px rgba(255,45,85,0.4), 0 0 40px rgba(255,45,85,0.15)',
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'cyber-grid': 'linear-gradient(rgba(255,214,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,214,0,0.03) 1px, transparent 1px)',
            },
            backgroundSize: {
                'grid': '60px 60px',
            },
        },
    },
    plugins: [],
}

export default config
