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

/**
 * 根据关键词生成一个稳定的数字种子
 * 确保相同的景点名称总是返回相同的占位图
 */
function generateSeedFromQuery(query: string): number {
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
        const char = query.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    // 确保是正数，并且在 1-1000 范围内（picsum 有 ~1000 张图片）
    return Math.abs(hash % 1000) + 1;
}

/**
 * 生成可靠的占位图 URL
 * 使用 picsum.photos 服务，该服务稳定可靠
 */
function getFallbackImageUrl(query: string): string {
    const seed = generateSeedFromQuery(query);
    // 使用 picsum.photos，基于种子生成稳定的风景图片
    return `https://picsum.photos/seed/${seed}/800/600`;
}

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
            const fallbackUrl = getFallbackImageUrl(query);
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
            const fallbackUrl = getFallbackImageUrl(query);
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
            const fallbackUrl = getFallbackImageUrl(query);
            // 也缓存占位图结果，避免重复请求 Unsplash API
            imageCache.set(query, { url: fallbackUrl, timestamp: Date.now() });

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
        const fallbackUrl = getFallbackImageUrl(query);
        return NextResponse.json({
            success: true,
            imageUrl: fallbackUrl,
            fallback: true
        });
    }
}
