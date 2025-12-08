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
        <div className="w-full p-6 md:p-8 pb-0">
            {/* 顶部图片 - 16:9 Clean Rounded */}
            <div className="relative w-full aspect-video md:aspect-[2/1] overflow-hidden rounded-2xl shadow-sm mb-6 bg-slate-100 group">
                {backgroundImage ? (
                    <Image
                        src={backgroundImage}
                        alt={meta.city}
                        fill
                        priority
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 500px"
                    />
                ) : (
                    <div className={`absolute inset-0 bg-slate-200 ${isLoading ? 'animate-pulse' : ''}`} />
                )}
                {/* 极简遮罩 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
            </div>

            {/* 标题区域 */}
            <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-800 leading-tight tracking-tight">
                        {meta.trip_title}
                    </h1>
                </div>

                <p className="text-lg text-slate-500 font-light italic leading-relaxed">
                    &ldquo;{meta.trip_vibe}&rdquo;
                </p>

                {/* Info Cards Row - Compact */}
                <div className="flex flex-wrap gap-3 pt-4">
                    {/* 费用卡片 */}
                    <div className="px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-orange-500 border border-slate-100">
                            <Coins className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">预估人均</p>
                            <p className="text-sm font-bold text-slate-700">¥{meta.total_estimated_cost}</p>
                        </div>
                    </div>

                    {/* 建议卡片 */}
                    <div className="flex-1 px-4 py-2.5 bg-sky-50 rounded-xl border border-sky-100 flex items-center gap-3">
                        <div className="shrink-0 w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center">
                            <Lightbulb className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-sky-400 uppercase tracking-wider font-bold">贴士</p>
                            <p className="text-sm text-sky-800 truncate">
                                {meta.suggestion}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 分隔线 */}
            <div className="h-px w-full bg-slate-100 mt-8" />
        </div>
    );
}
