'use client';

import { useState, useEffect, useCallback } from 'react';

// 全局图片缓存
const imageCache = new Map<string, string>();
const loadingPromises = new Map<string, Promise<string | null>>();

interface UseUnsplashImageResult {
    imageUrl: string | null;
    isLoading: boolean;
    error: string | null;
}

/**
 * 自定义 Hook: 根据关键词从 Unsplash 获取图片
 * 只对 spot (景点) 类型调用 API，food (餐饮) 类型返回 null
 * 
 * @param keyword - 搜索关键词 (通常是地点名称)
 * @param city - 城市名称，用于提高搜索精度
 * @param type - 类型: 'spot' | 'food'，只有 spot 才获取图片
 */
export function useUnsplashImage(
    keyword: string,
    city: string,
    type: 'spot' | 'food' = 'spot'
): UseUnsplashImageResult {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchImage = useCallback(async (searchKeyword: string, searchCity: string) => {
        const cacheKey = `${searchKeyword}-${searchCity}`;

        // 检查缓存
        if (imageCache.has(cacheKey)) {
            return imageCache.get(cacheKey)!;
        }

        // 检查是否正在加载
        if (loadingPromises.has(cacheKey)) {
            return loadingPromises.get(cacheKey);
        }

        // 创建加载 Promise
        const loadPromise = (async () => {
            try {
                const response = await fetch(
                    `/api/image?query=${encodeURIComponent(searchKeyword + ' ' + searchCity)}`
                );
                const result = await response.json();

                if (result.success && result.imageUrl) {
                    imageCache.set(cacheKey, result.imageUrl);
                    return result.imageUrl;
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

    useEffect(() => {
        // 只对 spot 类型获取图片
        if (type !== 'spot' || !keyword) {
            setImageUrl(null);
            setIsLoading(false);
            return;
        }

        const cacheKey = `${keyword}-${city}`;

        // 检查缓存
        if (imageCache.has(cacheKey)) {
            setImageUrl(imageCache.get(cacheKey)!);
            setIsLoading(false);
            return;
        }

        // 开始加载
        setIsLoading(true);
        setError(null);

        fetchImage(keyword, city)
            .then((url) => {
                setImageUrl(url);
                setIsLoading(false);
            })
            .catch((err) => {
                setError(err instanceof Error ? err.message : '获取图片失败');
                setIsLoading(false);
            });
    }, [keyword, city, type, fetchImage]);

    return { imageUrl, isLoading, error };
}

/**
 * 批量预加载多张图片
 * 用于在组件渲染之前预先加载所有景点图片
 */
export async function preloadImages(
    items: Array<{ title: string; type: 'spot' | 'food' }>,
    city: string
): Promise<void> {
    const spotItems = items.filter(item => item.type === 'spot');

    await Promise.all(
        spotItems.map(async (item) => {
            const cacheKey = `${item.title}-${city}`;
            if (imageCache.has(cacheKey)) return;

            try {
                const response = await fetch(
                    `/api/image?query=${encodeURIComponent(item.title + ' ' + city)}`
                );
                const result = await response.json();

                if (result.success && result.imageUrl) {
                    imageCache.set(cacheKey, result.imageUrl);
                }
            } catch (err) {
                console.error('Preload image failed:', item.title, err);
            }
        })
    );
}

export default useUnsplashImage;
