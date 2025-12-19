/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
            {
                protocol: 'https',
                hostname: 'source.unsplash.com',
            },
            {
                protocol: 'https',
                hostname: 'picsum.photos',
            },
            // Bing 图片搜索结果域名
            {
                protocol: 'https',
                hostname: '*.bing.net',
            },
            {
                protocol: 'https',
                hostname: 'tse*.mm.bing.net',
            },
            {
                protocol: 'https',
                hostname: 'th.bing.com',
            },
            // 常见图片 CDN 域名（Dify 搜索可能返回）
            {
                protocol: 'https',
                hostname: '*.ctrip.com',
            },
            {
                protocol: 'https',
                hostname: '*.mafengwo.net',
            },
            {
                protocol: 'https',
                hostname: '*.qyer.com',
            },
            {
                protocol: 'https',
                hostname: '*.alicdn.com',
            },
            {
                protocol: 'https',
                hostname: '*.hdslb.com',
            },
            {
                protocol: 'https',
                hostname: '*.sinaimg.cn',
            },
            // 通用匹配（生产环境可按需收紧）
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
    },
    experimental: {
        serverComponentsExternalPackages: ['puppeteer-core'],
    },
};

module.exports = nextConfig;
