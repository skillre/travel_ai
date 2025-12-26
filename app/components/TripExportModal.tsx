'use client';

import React, { useRef, useState, useEffect } from 'react';
import { X, Download, Share2, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { TripPlan, TripPlanDay } from '../types';
import { useUnsplashImage } from '../hooks/useUnsplashImage';
import TripCheatsheetView from './TripCheatsheetView';
import TripRouteMapView from './TripRouteMapView';
import DayDetailExportView from './DayDetailExportView';

interface TripExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    tripPlan: TripPlan;
}

interface ExportImage {
    id: string;
    blob: Blob | null; // null means failed
    url: string;
    name: string;
    type: 'overview' | 'map' | 'day';
    label: string;
}

// 辅助组件：用于预加载并收集所有图片 URL
const ImageCollector = ({
    tripPlan,
    onCollected
}: {
    tripPlan: TripPlan,
    onCollected: (map: Record<string, string>) => void
}) => {
    // 简单起见，我们直接构建一个需要搜索的列表
    // 实际上我们需要调用 Unsplash API。由于在客户端我们已经有 useUnsplashImage hook，
    // 这里我们可以不可见地渲染所有组件一次，利用 hook 的缓存机制（如果 hook 有缓存）。
    // 但更好的方式是让后端处理，或者我们在前端批量请求。
    // 为了简化 V1 实现，我们假设用户已经浏览过行程，图片由于 React Query 或 Hook 缓存通常已经存在。
    // 如果是第一次打开，Hooks 会触发请求。

    // 这里我们不做复杂的预抓取，而是依赖用户在主界面可能已经加载了图片。
    // 对于真正高质量的导出，我们在调用 API 时，只需传递原始数据，
    // 后端渲染时如果没有图片 URL，会显示默认占位符。

    // 进阶优化：前端在 memory 中维护一个 imageCache。
    // 由于当前架构限制，我们暂时跳过主动收集，直接让后端 API 接收 tripPlan。
    // *注意*：为了让后端 Puppeteer 能显示图片，我们需要确保图片 URL 是可访问的。
    // 如果 useUnsplashImage 是在客户端动态获取的 URL，我们需要一种方式把这些 URL 传给后端。

    useEffect(() => {
        // 模拟收集完成
        onCollected({});
    }, []);
    return null;
};

export default function TripExportModal({ isOpen, onClose, tripPlan }: TripExportModalProps) {
    // State
    const [images, setImages] = useState<ExportImage[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isZipping, setIsZipping] = useState(false);
    const [statusMessage, setStatusMessage] = useState('准备中...');

    // 触摸滑动相关 ref
    const touchStartRef = useRef(0);
    const touchEndRef = useRef(0);

    // Reset when closed
    useEffect(() => {
        if (!isOpen) {
            images.forEach(img => {
                if (img.url) URL.revokeObjectURL(img.url);
            });
            setImages([]);
            setCurrentIndex(0);
            setLoadingProgress(0);
            setIsGenerating(false);
            setIsZipping(false);
        }
    }, [isOpen]);

    // Start generation when opened
    useEffect(() => {
        if (isOpen && images.length === 0 && !isGenerating) {
            startGeneration();
        }
    }, [isOpen]);

    const startGeneration = async () => {
        setIsGenerating(true);
        setLoadingProgress(5);

        try {
            // Define capture list
            const captureTargets = [
                { id: 'overview', name: `${tripPlan.meta.city}_行程总览`, type: 'overview', label: '行程总览' },
                { id: 'map', name: `${tripPlan.meta.city}_路线地图`, type: 'map', label: '路线地图' },
                ...tripPlan.timeline.map(day => ({
                    id: `day-${day.day}`,
                    name: `${tripPlan.meta.city}_Day${day.day}_${day.date_theme || '行程详情'}`,
                    type: 'day',
                    label: `Day ${day.day} 详情`,
                    dayPlan: day
                }))
            ];

            const totalTargets = captureTargets.length;
            const newImages: ExportImage[] = [];

            // 预处理 tripPlan 数据，尝试注入已知的图片 URL (如果有全局缓存)
            // 这里我们做一个简单的深拷贝，准备发送给 API
            const tripPlanPayload = JSON.parse(JSON.stringify(tripPlan));

            // 注入图片缓存 (Client Side Cache -> TripPlan Payload)
            // 这样 API Route 可以直接使用客户端已经加载的图片，无需重复请求
            // 注意：这里需要引入 getGlobalImageCache，由于是同一个 module scope，
            // 只要 useUnsplashImage.ts 被加载过，cache 就存在。
            const { getGlobalImageCache } = await import('../hooks/useUnsplashImage');
            const cache = getGlobalImageCache();

            if (cache.size > 0 && tripPlanPayload.timeline) {
                tripPlanPayload.timeline.forEach((day: any) => {
                    if (day.items) {
                        day.items.forEach((item: any) => {
                            if (item.type === 'spot') {
                                // 尝试匹配缓存 key: `${item.title}-${city}` or `${item.title}-${city}-spot`
                                // useUnsplashImage hook 内部 key 规则: 
                                // loose matching logic
                                const baseKey = `${item.title}-${tripPlan.meta.city}`;
                                const strictKey = `${baseKey}-spot`;

                                if (cache.has(strictKey)) {
                                    item.resolvedImageUrl = cache.get(strictKey);
                                } else if (cache.has(baseKey)) {
                                    item.resolvedImageUrl = cache.get(baseKey);
                                }
                            }
                        });
                    }
                });
            }

            for (let i = 0; i < totalTargets; i++) {
                const target = captureTargets[i];
                setStatusMessage(`正在生成: ${target.label}...`);

                try {
                    const response = await fetch('/api/export', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: target.type,
                            tripPlan: tripPlanPayload,
                            dayPlan: (target as any).dayPlan, // 只有 type='day' 时这里才有值
                            exportFormat: 'png' // 预览始终请求 PNG
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`API failed: ${response.statusText}`);
                    }

                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);

                    newImages.push({
                        id: target.id,
                        blob,
                        url,
                        name: target.name,
                        type: target.type as any,
                        label: target.label
                    });
                } catch (err) {
                    console.error(`Failed to generate ${target.label}:`, err);
                    // 即使失败也添加占位，或者跳过
                }

                setLoadingProgress(10 + Math.round(((i + 1) / totalTargets) * 90));
            }

            setImages(newImages);
        } catch (error) {
            console.error('Batch generation failed:', error);
            alert('生成预览失败，请检查服务状态');
        } finally {
            setIsGenerating(false);
            setLoadingProgress(100);
        }
    };

    const handleDownloadCurrent = () => {
        if (images[currentIndex] && images[currentIndex].blob) {
            saveAs(images[currentIndex].blob!, `${images[currentIndex].name}.png`);
        }
    };

    const handleDownloadAll = async () => {
        if (images.length === 0) return;
        setIsZipping(true);

        try {
            const zip = new JSZip();
            const folder = zip.folder(`${tripPlan.meta.city}_全套路书`);

            if (folder) {
                images.forEach(img => {
                    if (img.blob) {
                        folder.file(`${img.name}.png`, img.blob);
                    }
                });

                const content = await zip.generateAsync({ type: 'blob' });
                saveAs(content, `${tripPlan.meta.city}_全套路书.zip`);
            }
        } catch (error) {
            console.error('Zip failed:', error);
            alert('打包下载失败，请尝试逐张下载');
        } finally {
            setIsZipping(false);
        }
    };

    const nextImage = () => {
        setCurrentIndex(prev => (prev + 1) % images.length);
    };

    const prevImage = () => {
        setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
    };

    // 触摸滑动处理
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartRef.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        touchEndRef.current = e.touches[0].clientX;
    };

    const handleTouchEnd = () => {
        if (!touchStartRef.current || !touchEndRef.current) return;
        
        const distance = touchStartRef.current - touchEndRef.current;
        const minSwipeDistance = 50;

        if (distance > minSwipeDistance) {
            // 向左滑动，显示下一张
            nextImage();
        } else if (distance < -minSwipeDistance) {
            // 向右滑动，显示上一张
            prevImage();
        }
        
        touchStartRef.current = 0;
        touchEndRef.current = 0;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">

            <div className="bg-transparent w-full max-w-6xl h-full max-h-[90vh] flex flex-col items-center justify-center text-white">

                {/* Loading State */}
                {isGenerating && (
                    <div className="flex flex-col items-center justify-center gap-4 p-8 bg-slate-900/50 rounded-2xl backdrop-blur-sm border border-white/10">
                        <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
                        <div className="text-center">
                            <h3 className="text-xl font-bold mb-2">正在云端生成路书...</h3>
                            <p className="text-slate-400 text-sm">{statusMessage} ({Math.round(loadingProgress)}%)</p>
                            <div className="w-64 h-2 bg-slate-700 rounded-full mt-4 overflow-hidden">
                                <div
                                    className="h-full bg-indigo-500 transition-all duration-300 ease-out"
                                    style={{ width: `${loadingProgress}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Preview Carousel */}
                {!isGenerating && images.length > 0 && (
                    <div className="w-full h-full flex flex-col items-center">
                        {/* Top Bar */}
                        <div className="w-full flex items-center justify-between px-4 mb-4">
                            <div className="flex flex-col">
                                <h2 className="text-2xl font-bold">{tripPlan.meta.city}行程路书</h2>
                                <p className="text-white/60 text-sm">共 {images.length} 张精美卡片</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Carousel Area */}
                        <div className="flex-1 w-full flex items-center justify-center gap-4 min-h-0">
                            {/* Prev Button */}
                            <button
                                onClick={prevImage}
                                className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur transition-colors shrink-0 hidden md:block"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>

                            {/* Image Container - 支持触摸滑动 */}
                            <div 
                                className="relative h-full flex-1 flex items-center justify-center overflow-hidden py-4 touch-pan-y"
                                onTouchStart={handleTouchStart}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                            >
                                {images[currentIndex].url ? (
                                    <img
                                        src={images[currentIndex].url}
                                        alt={images[currentIndex].name}
                                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-all duration-300 select-none"
                                        draggable={false}
                                    />
                                ) : (
                                    <div className="flex items-center justify-center w-64 h-64 bg-slate-800 rounded-lg text-slate-500">
                                        图片加载失败
                                    </div>
                                )}

                                {/* Label Badge */}
                                <div className="absolute bottom-6 bg-black/60 backdrop-blur px-4 py-2 rounded-full text-sm font-medium border border-white/10">
                                    {images[currentIndex].label} ({currentIndex + 1}/{images.length})
                                </div>
                            </div>

                            {/* Next Button */}
                            <button
                                onClick={nextImage}
                                className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur transition-colors shrink-0 hidden md:block"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Mobile Navigation Dots */}
                        <div className="flex gap-2 mt-4 md:hidden">
                            {images.map((_, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => setCurrentIndex(idx)}
                                    className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex ? 'bg-white w-4' : 'bg-white/30'}`}
                                ></div>
                            ))}
                        </div>

                        {/* Bottom Actions */}
                        <div className="w-full max-w-md flex flex-col sm:flex-row gap-3 mt-6">
                            <button
                                onClick={handleDownloadCurrent}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl backdrop-blur border border-white/10 transition-all active:scale-95"
                            >
                                <Download className="w-4 h-4" />
                                保存当前图片
                            </button>

                            <button
                                onClick={handleDownloadAll}
                                disabled={isZipping}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isZipping ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        正在打包...
                                    </>
                                ) : (
                                    <>
                                        <Share2 className="w-4 h-4" />
                                        下载全套路书
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
