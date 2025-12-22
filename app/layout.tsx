import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { UserProvider } from './contexts/UserContext';

const inter = Inter({ subsets: ['latin'] });

// 移动端 viewport 配置 - 禁止用户缩放，确保原生 App 体验
export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover', // 支持 iPhone 刘海屏
};

export const metadata: Metadata = {
    title: 'AI 旅行规划师 - 智能生成您的完美行程',
    description: '使用 AI 技术为您规划个性化旅行路线，探索美食、景点和文化体验',
    keywords: ['旅行规划', 'AI', '行程生成', '旅游攻略'],
    // PWA 相关配置
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'AI 旅行规划师',
    },
    formatDetection: {
        telephone: false, // 禁止自动识别电话号码
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="zh-CN">
            <body className={inter.className}>
                <UserProvider>
                    {children}
                </UserProvider>
            </body>
        </html>
    );
}
