import { NextRequest, NextResponse } from 'next/server';
import { queryNotionImage, createNotionImageRecord } from '@/app/lib/notion-image';
import { callDifyImageWorkflow } from '@/app/lib/dify-client';

// 强制动态渲染，解决 Vercel 部署静态渲染问题
export const dynamic = 'force-dynamic';

// 内存缓存（作为第一层缓存，减少 Notion API 调用）
const memoryCache = new Map<string, { url: string; timestamp: number }>();
const MEMORY_CACHE_TTL = 1000 * 60 * 30; // 30分钟内存缓存

/**
 * 根据关键词生成一个稳定的数字种子
 * 确保相同的景点名称总是返回相同的占位图
 */
function generateSeedFromQuery(query: string): number {
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
        const char = query.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash % 1000) + 1;
}

/**
 * 生成可靠的占位图 URL
 */
function getFallbackImageUrl(query: string): string {
    const seed = generateSeedFromQuery(query);
    return `https://picsum.photos/seed/${seed}/800/600`;
}

/**
 * 图片获取 API - Read-Through 策略
 * 
 * 读取路径（快速）：
 * 1. 内存缓存 -> 2. Notion 数据库
 * 
 * 写入路径（智能）：
 * 如果未找到 -> Dify 工作流（LLM 实体检查 -> Bing 搜索 -> 写入 Notion）
 */
export async function GET(request: NextRequest) {
    const startTime = Date.now();
    
    try {
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('query');
        const city = searchParams.get('city') || '';
        const type = searchParams.get('type') as 'spot' | 'food' || 'spot';

        if (!query) {
            return NextResponse.json(
                { error: '缺少搜索关键词' },
                { status: 400 }
            );
        }

        // 生成缓存键
        const cacheKey = `${query}:${city}:${type}`;

        // ========== 第1层：内存缓存 ==========
        const memoryCached = memoryCache.get(cacheKey);
        if (memoryCached && Date.now() - memoryCached.timestamp < MEMORY_CACHE_TTL) {
            return NextResponse.json({
                success: true,
                imageUrl: memoryCached.url,
                source: 'memory',
                latency: Date.now() - startTime
            });
        }

        // ========== 第2层：Notion 数据库 ==========
        const notionResult = await queryNotionImage(query, city || undefined);
        
        if (notionResult.found && notionResult.record?.imageUrl) {
            // 更新内存缓存
            memoryCache.set(cacheKey, {
                url: notionResult.record.imageUrl,
                timestamp: Date.now()
            });

            return NextResponse.json({
                success: true,
                imageUrl: notionResult.record.imageUrl,
                source: 'notion',
                standardizedName: notionResult.record.name,
                latency: Date.now() - startTime
            });
        }

        // ========== 第3层：Dify 工作流（智能获取）==========
        const difyResult = await callDifyImageWorkflow({
            query_name: query,
            city: city,
            type: type
        });

        if (difyResult.success && difyResult.imageUrl) {
            // 更新内存缓存
            memoryCache.set(cacheKey, {
                url: difyResult.imageUrl,
                timestamp: Date.now()
            });

            return NextResponse.json({
                success: true,
                imageUrl: difyResult.imageUrl,
                source: 'dify',
                standardizedName: difyResult.standardizedName,
                latency: Date.now() - startTime
            });
        }

        // ========== 回退：Unsplash API（如果配置了）==========
        const accessKey = process.env.UNSPLASH_ACCESS_KEY;
        
        if (accessKey) {
            const unsplashResult = await fetchFromUnsplash(query, city, type, accessKey);
            
            if (unsplashResult.success && unsplashResult.imageUrl) {
                // 异步写入 Notion（不阻塞响应）
                createNotionImageRecord(query, city, unsplashResult.imageUrl, [], 'Auto')
                    .catch(err => console.error('Failed to save to Notion:', err));

                // 更新内存缓存
                memoryCache.set(cacheKey, {
                    url: unsplashResult.imageUrl,
                    timestamp: Date.now()
                });

                return NextResponse.json({
                    success: true,
                    imageUrl: unsplashResult.imageUrl,
                    source: 'unsplash',
                    photographer: unsplashResult.photographer,
                    photographerUrl: unsplashResult.photographerUrl,
                    latency: Date.now() - startTime
                });
            }
        }

        // ========== 最终回退：占位图 ==========
        const fallbackUrl = getFallbackImageUrl(query);
        
        // 缓存占位图（避免重复计算）
        memoryCache.set(cacheKey, {
            url: fallbackUrl,
            timestamp: Date.now()
        });

        return NextResponse.json({
            success: true,
            imageUrl: fallbackUrl,
            source: 'fallback',
            fallback: true,
            latency: Date.now() - startTime
        });

    } catch (error) {
        console.error('Image search error:', error);
        
        const query = request.nextUrl.searchParams.get('query') || 'travel';
        const fallbackUrl = getFallbackImageUrl(query);
        
        return NextResponse.json({
            success: true,
            imageUrl: fallbackUrl,
            source: 'fallback',
            fallback: true,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

/**
 * 从 Unsplash 获取图片（保留原有逻辑作为回退）
 */
async function fetchFromUnsplash(
    query: string,
    city: string,
    type: 'spot' | 'food',
    accessKey: string
): Promise<{
    success: boolean;
    imageUrl?: string;
    photographer?: string;
    photographerUrl?: string;
}> {
    try {
        const typeHint = type === 'food' ? 'restaurant cuisine' : 'scenery landmark';
        const searchQuery = `${query} ${city} ${typeHint}`.trim();
        
        const response = await fetch(
            `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=1&orientation=landscape`,
            {
                headers: {
                    'Authorization': `Client-ID ${accessKey}`,
                },
            }
        );

        if (!response.ok) {
            console.error('Unsplash API error:', response.status);
            return { success: false };
        }

        const data = await response.json();

        if (data.results && data.results.length > 0) {
            return {
                success: true,
                imageUrl: data.results[0].urls.regular,
                photographer: data.results[0].user.name,
                photographerUrl: data.results[0].user.links.html
            };
        }

        return { success: false };

    } catch (error) {
        console.error('Unsplash fetch error:', error);
        return { success: false };
    }
}

/**
 * POST 方法：批量获取图片
 * 用于预加载多个地点的图片
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { items, city } = body as {
            items: Array<{ name: string; type: 'spot' | 'food' }>;
            city: string;
        };

        if (!items || !Array.isArray(items)) {
            return NextResponse.json(
                { error: '缺少 items 参数' },
                { status: 400 }
            );
        }

        // 并行获取所有图片
        const results = await Promise.all(
            items.map(async (item) => {
                const cacheKey = `${item.name}:${city}:${item.type}`;
                
                // 检查内存缓存
                const cached = memoryCache.get(cacheKey);
                if (cached && Date.now() - cached.timestamp < MEMORY_CACHE_TTL) {
                    return {
                        name: item.name,
                        imageUrl: cached.url,
                        source: 'memory'
                    };
                }

                // 查询 Notion
                const notionResult = await queryNotionImage(item.name, city);
                if (notionResult.found && notionResult.record?.imageUrl) {
                    memoryCache.set(cacheKey, {
                        url: notionResult.record.imageUrl,
                        timestamp: Date.now()
                    });
                    return {
                        name: item.name,
                        imageUrl: notionResult.record.imageUrl,
                        source: 'notion'
                    };
                }

                // 返回 null，让前端单独请求（触发 Dify 工作流）
                return {
                    name: item.name,
                    imageUrl: null,
                    source: 'pending'
                };
            })
        );

        return NextResponse.json({
            success: true,
            results
        });

    } catch (error) {
        console.error('Batch image fetch error:', error);
        return NextResponse.json(
            { error: '批量获取图片失败' },
            { status: 500 }
        );
    }
}
