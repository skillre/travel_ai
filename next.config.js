/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    images: {
        // 由于图片来源多样（Dify 搜索返回的各种 CDN），
        // 使用 unoptimized 模式跳过 Next.js 图片优化
        // 这样可以加载任意域名的图片
        unoptimized: true,
    },
    experimental: {
        serverComponentsExternalPackages: ['puppeteer-core'],
    },
};

module.exports = nextConfig;
