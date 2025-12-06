import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'AI 旅行规划师 - 智能生成您的完美行程',
    description: '使用 AI 技术为您规划个性化旅行路线，探索美食、景点和文化体验',
    keywords: ['旅行规划', 'AI', '行程生成', '旅游攻略'],
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="zh-CN">
            <body className={inter.className}>{children}</body>
        </html>
    );
}
