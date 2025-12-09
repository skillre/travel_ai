import { NextRequest, NextResponse } from 'next/server';

// 强制动态渲染，解决 Vercel 部署静态渲染问题
export const dynamic = 'force-dynamic';

interface UnsplashPhoto {
    urls: {
        small: string;
        regular: string;
        thumb: string;
    };
    alt_description: string;
    user: {
        name: string;
        links: {
            html: string;
        };
    };
}

interface UnsplashResponse {
    results: UnsplashPhoto[];
}

// 简单的内存缓存
const imageCache = new Map<string, { url: string; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1小时缓存

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('query');

        if (!query) {
            return NextResponse.json(
                { error: '缺少搜索关键词' },
                { status: 400 }
            );
        }

        // 检查缓存
        const cached = imageCache.get(query);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return NextResponse.json({ success: true, imageUrl: cached.url });
        }

        const accessKey = process.env.UNSPLASH_ACCESS_KEY;

        if (!accessKey) {
            // 如果没有配置 Unsplash API，返回占位图
            const fallbackUrl = `https://source.unsplash.com/featured/800x600?${encodeURIComponent(query)},travel`;
            return NextResponse.json({
                success: true,
                imageUrl: fallbackUrl,
                fallback: true
            });
        }

        // 调用 Unsplash API
        const response = await fetch(
            `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query + ' travel china')}&per_page=1&orientation=landscape`,
            {
                headers: {
                    'Authorization': `Client-ID ${accessKey}`,
                },
            }
        );

        if (!response.ok) {
            console.error('Unsplash API error:', response.status);
            // 返回占位图
            const fallbackUrl = `https://source.unsplash.com/featured/800x600?${encodeURIComponent(query)},travel`;
            return NextResponse.json({
                success: true,
                imageUrl: fallbackUrl,
                fallback: true
            });
        }

        const data: UnsplashResponse = await response.json();

        if (data.results && data.results.length > 0) {
            const imageUrl = data.results[0].urls.regular;
            // 缓存结果
            imageCache.set(query, { url: imageUrl, timestamp: Date.now() });

            return NextResponse.json({
                success: true,
                imageUrl,
                photographer: data.results[0].user.name,
                photographerUrl: data.results[0].user.links.html,
            });
        } else {
            // 没有找到图片，返回占位图
            const fallbackUrl = `https://source.unsplash.com/featured/800x600?${encodeURIComponent(query)},travel`;
            return NextResponse.json({
                success: true,
                imageUrl: fallbackUrl,
                fallback: true
            });
        }

    } catch (error) {
        console.error('Image search error:', error);
        // 出错时返回占位图
        const query = request.nextUrl.searchParams.get('query') || 'travel';
        const fallbackUrl = `https://source.unsplash.com/featured/800x600?${encodeURIComponent(query)},travel`;
        return NextResponse.json({
            success: true,
            imageUrl: fallbackUrl,
            fallback: true
        });
    }
}
