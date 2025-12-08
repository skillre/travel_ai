'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Coins, Lightbulb } from 'lucide-react';
import { TripPlanMeta } from '../types';

interface ResultHeroSectionProps {
    meta: TripPlanMeta;
}

/**
 * 结果页顶部概览组件
 * - 根据城市从 Unsplash 获取背景图
 * - 黑色渐变遮罩突出文字
 * - 毛玻璃信息条显示费用和贴士
 */
export default function ResultHeroSection({ meta }: ResultHeroSectionProps) {
    const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // 获取城市背景图
    useEffect(() => {
        const fetchCityImage = async () => {
            try {
                const response = await fetch(
                    `/api/image?query=${encodeURIComponent(meta.city + ' cityscape landmark')}`
                );
                const result = await response.json();

                if (result.success && result.imageUrl) {
                    setBackgroundImage(result.imageUrl);
                }
            } catch (error) {
                console.error('Failed to fetch city image:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCityImage();
    }, [meta.city]);

    return (
        <div className="relative w-full h-64 md:h-80 overflow-hidden rounded-2xl md:rounded-3xl shadow-soft group">
            {/* 背景图 */}
            {backgroundImage ? (
                <Image
                    src={backgroundImage}
                    alt={meta.city}
                    fill
                    priority
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="100vw"
                />
            ) : (
                <div className={`absolute inset-0 bg-gradient-to-br from-tender-blue-100 to-cream-100 ${isLoading ? 'animate-pulse' : ''}`} />
            )}

            {/* 渐变遮罩 - 更轻柔 */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

            {/* 内容区域 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                {/* 标题 */}
                <h1 className="text-3xl md:text-5xl font-bold text-white mb-3 drop-shadow-md tracking-tight">
                    {meta.trip_title}
                </h1>

                {/* 副标题 (斜体) */}
                <p className="text-lg md:text-xl text-white/90 italic max-w-2xl mb-8 drop-shadow-sm font-light">
                    &ldquo;{meta.trip_vibe}&rdquo;
                </p>
            </div>

            {/* 底部毛玻璃信息条 - Light Glass */}
            <div className="absolute bottom-4 left-4 right-4">
                <div className="mx-auto max-w-4xl bg-white/80 backdrop-blur-xl rounded-2xl border border-white/60 px-6 py-4 shadow-glass">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        {/* 预估费用 */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-fresh-green-100 flex items-center justify-center text-fresh-green-600">
                                <Coins className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">预估人均</p>
                                <p className="text-xl font-bold text-slate-800">
                                    ¥{meta.total_estimated_cost}
                                </p>
                            </div>
                        </div>

                        {/* 分隔线 */}
                        <div className="hidden md:block w-px h-10 bg-slate-200" />

                        {/* 贴士 - 跑马灯效果 */}
                        <div className="flex-1 flex items-center gap-3 overflow-hidden w-full md:w-auto">
                            <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-500">
                                <Lightbulb className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">贴士</p>
                                <div className="relative overflow-hidden w-full">
                                    <p className="text-slate-700 text-sm whitespace-nowrap animate-marquee font-medium">
                                        💡 {meta.suggestion}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
