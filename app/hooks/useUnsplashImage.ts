'use client';

/**
 * @deprecated 请使用 useImage hook 代替
 * 
 * 此文件保留以保持向后兼容性
 * 新代码请直接使用 ./useImage.ts
 */

import { useImage, preloadImages } from './useImage';

// 重新导出新的 hook 和工具函数
export { useImage, preloadImages };

// 为了向后兼容，保留旧的 hook 名称
export function useUnsplashImage(
    keyword: string,
    city: string,
    type: 'spot' | 'food' = 'spot'
) {
    const { imageUrl, loadingState, error } = useImage(keyword, city, type);
    
    return {
        imageUrl,
        isLoading: loadingState === 'loading',
        error
    };
}

// 空实现，保持 API 兼容
export function getGlobalImageCache(): Map<string, string> {
    return new Map();
}

export default useUnsplashImage;
