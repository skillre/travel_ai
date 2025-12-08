/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                // 保留原有的 primary 以兼容，但建议后续替换
                primary: {
                    50: '#f0f9ff',
                    100: '#e0f2fe',
                    200: '#bae6fd',
                    300: '#7dd3fc',
                    400: '#38bdf8',
                    500: '#0ea5e9',
                    600: '#0284c7',
                    700: '#0369a1',
                    800: '#075985',
                    900: '#0c4a6e',
                },
                // 新增 "清新/温柔" 色系
                cream: {
                    50: '#FFFEFA',
                    100: '#FDFBF7',
                    200: '#F7F3E8',
                    300: '#EBE5D5',
                },
                'fresh-green': {
                    50: '#F2FCF5',
                    100: '#E1F7E7',
                    200: '#C3EBD0',
                    300: '#95D9AD',
                    400: '#5FBf82',
                    500: '#34A853', // 谷歌绿/自然绿
                },
                'tender-blue': {
                    50: '#F4F8FA',
                    100: '#E3F1F6',
                    200: '#C4E1ED',
                    300: '#94C9E0',
                    400: '#5FA8CD',
                    500: '#3888B3',
                },
                'soft-pink': {
                    50: '#FEF6F9',
                    100: '#FDECF4',
                    200: '#FCCDE4',
                },
                'mist': {
                    50: '#F8FAFC', // Cool white
                    100: '#F1F5F9',
                }
            },
            fontFamily: {
                sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
            },
            animation: {
                'gradient': 'gradient 15s ease infinite', // Slower, smoother
                'float': 'float 6s ease-in-out infinite', // Slower float
                'float-slow': 'float 8s ease-in-out infinite',
                'float-delayed': 'float 7s ease-in-out 3s infinite',
                'breathe': 'breathe 4s ease-in-out infinite',
                'fade-in': 'fadeIn 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
                'fade-in-up': 'fadeInUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
                'scale-in': 'scaleIn 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
            },
            keyframes: {
                gradient: {
                    '0%, 100%': {
                        'background-position': '0% 50%',
                    },
                    '50%': {
                        'background-position': '100% 50%',
                    },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-15px)' }, // Slightly more movement
                },
                breathe: {
                    '0%, 100%': { opacity: '0.8', transform: 'scale(1)' },
                    '50%': { opacity: '0.4', transform: 'scale(1.05)' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(30px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                }
            },
            boxShadow: {
                'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
                'glow': '0 0 15px rgba(56, 189, 248, 0.3)',
                'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
            }
        },
    },
    plugins: [],
}
