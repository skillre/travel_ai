'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// 请求去重（防止同一图片重复请求）
const loadingPromises = new Map<string, Promise<ImageResult | null>>();

// 图片加载状态
export type ImageLoadingState = 'idle' | 'loading' | 'loaded' | 'error';

export interface ImageResult {
    url: string;
    source: 'notion' | 'dify' | 'unsplash' | 'fallback';
    standardizedName?: string;
    latency?: number;
}

export interface UseImageResult {
    imageUrl: string | null;
    loadingState: ImageLoadingState;
    source: string | null;
    error: string | null;
    retry: () => void;
}

/**
 * 自定义 Hook: 智能图片获取
 * 
 * 特性:
 * - 直接从 Notion/Dify 获取图片（无本地缓存）
 * - 乐观 UI：立即显示骨架屏，异步加载图片
 * - 自动重试机制
 * - 防止重复请求（去重）
 * 
 * @param keyword - 搜索关键词 (通常是地点名称)
 * @param city - 城市名称，用于提高搜索精度
 * @param type - 类型: 'spot' | 'food'
 */
export function useImage(
    keyword: string,
    city: string,
    type: 'spot' | 'food' = 'spot'
): UseImageResult {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loadingState, setLoadingState] = useState<ImageLoadingState>('idle');
    const [source, setSource] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const retryCount = useRef(0);
    const maxRetries = 2;

    const fetchImage = useCallback(async (
        searchKeyword: string,
        searchCity: string,
        searchType: 'spot' | 'food'
    ): Promise<ImageResult | null> => {
        const cacheKey = `${searchKeyword}:${searchCity}:${searchType}`;

        // 检查是否正在加载（防止重复请求）
        if (loadingPromises.has(cacheKey)) {
            return loadingPromises.get(cacheKey)!;
        }

        // 创建加载 Promise
        const loadPromise = (async (): Promise<ImageResult | null> => {
            try {
                const params = new URLSearchParams({
                    query: searchKeyword,
                    city: searchCity,
                    type: searchType
                });

                const response = await fetch(`/api/image?${params}`);
                const result = await response.json();

                if (result.success && result.imageUrl) {
                    return {
                        url: result.imageUrl,
                        source: result.source || 'unknown',
                        standardizedName: result.standardizedName,
                        latency: result.latency
                    };
                }

                return null;

            } catch (err) {
                console.error('Failed to fetch image:', err);
                return null;
            } finally {
                loadingPromises.delete(cacheKey);
            }
        })();

        loadingPromises.set(cacheKey, loadPromise);
        return loadPromise;
    }, []);

    const loadImage = useCallback(async () => {
        if (!keyword) {
            setImageUrl(null);
            setLoadingState('idle');
            return;
        }

        // 开始加载
        setLoadingState('loading');
        setError(null);

        try {
            const result = await fetchImage(keyword, city, type);
            
            if (result) {
                setImageUrl(result.url);
                setSource(result.source);
                setLoadingState('loaded');
                retryCount.current = 0;
            } else {
                throw new Error('Failed to load image');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '获取图片失败');
            setLoadingState('error');
            
            // 自动重试
            if (retryCount.current < maxRetries) {
                retryCount.current++;
                setTimeout(() => {
                    loadImage();
                }, 1000 * retryCount.current); // 指数退避
            }
        }
    }, [keyword, city, type, fetchImage]);

    // 手动重试
    const retry = useCallback(() => {
        retryCount.current = 0;
        loadImage();
    }, [loadImage]);

    useEffect(() => {
        loadImage();
    }, [loadImage]);

    return {
        imageUrl,
        loadingState,
        source,
        error,
        retry
    };
}

/**
 * 批量预加载图片
 * 用于在组件渲染之前预先加载所有地点图片
 */
export async function preloadImages(
    items: Array<{ title: string; type: 'spot' | 'food' }>,
    city: string
): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    // 先尝试批量查询（快速路径 - 只查 Notion）
    try {
        const response = await fetch('/api/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: items.map(item => ({ name: item.title, type: item.type })),
                city
            })
        });

        const data = await response.json();
        
        if (data.success && data.results) {
            for (const result of data.results) {
                if (result.imageUrl) {
                    results.set(result.name, result.imageUrl);
                }
            }
        }
    } catch (err) {
        console.error('Batch preload failed:', err);
    }

    // 对于未找到的项，单独请求（会触发 Dify 工作流）
    const pendingItems = items.filter(item => !results.has(item.title));
    
    await Promise.all(
        pendingItems.map(async (item) => {
            try {
                const params = new URLSearchParams({
                    query: item.title,
                    city: city,
                    type: item.type
                });

                const response = await fetch(`/api/image?${params}`);
                const result = await response.json();

                if (result.success && result.imageUrl) {
                    results.set(item.title, result.imageUrl);
                }
            } catch (err) {
                console.error('Preload image failed:', item.title, err);
            }
        })
    );

    return results;
}

/**
 * 清除请求去重缓存
 */
export function clearLoadingPromises(): void {
    loadingPromises.clear();
}

export default useImage;
