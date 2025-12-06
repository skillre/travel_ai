'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Clock, Utensils, Lightbulb, Coins, MapPin, ChevronRight } from 'lucide-react';

// 新的数据结构接口
interface Route {
    time_period?: string;
    name: string;
    latitude: number;
    longitude: number;
    suggested_duration?: string;
    emoji?: string;
    tags?: string[];
    desc: string;
    food_recommendation?: string;
    tips?: string;
    cost?: number;
}

interface DailyPlan {
    day: number;
    theme?: string;
    routes: Route[];
}

interface ItineraryListProps {
    dailyPlan: DailyPlan[];
    city: string;
    tripTitle?: string;
    tripVibe?: string;
    totalDays: number;
    onSpotHover?: (dayIndex: number, spotIndex: number) => void;
    onSpotClick?: (dayIndex: number, spotIndex: number, route: Route) => void;
}

// 每天路线的颜色
const dayColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8'
];

// 时间段映射
const timePeriodIcons: Record<string, string> = {
    '早餐': '🌅',
    '上午': '☀️',
    '午餐': '🍱',
    '下午': '🌤️',
    '晚餐': '🌆',
    '晚上': '🌙',
};

// 图片缓存
const imageCache = new Map<string, string>();

export default function ItineraryList({
    dailyPlan,
    city,
    tripTitle,
    tripVibe,
    totalDays,
    onSpotHover,
    onSpotClick,
}: ItineraryListProps) {
    const [spotImages, setSpotImages] = useState<Record<string, string>>({});
    const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());

    // 获取图片
    const fetchImage = useCallback(async (spotName: string) => {
        // 检查缓存
        if (imageCache.has(spotName)) {
            setSpotImages(prev => ({ ...prev, [spotName]: imageCache.get(spotName)! }));
            return;
        }

        // 检查是否正在加载
        if (loadingImages.has(spotName)) return;

        setLoadingImages(prev => new Set(prev).add(spotName));

        try {
            const response = await fetch(`/api/image?query=${encodeURIComponent(spotName + ' ' + city)}`);
            const result = await response.json();

            if (result.success && result.imageUrl) {
                imageCache.set(spotName, result.imageUrl);
                setSpotImages(prev => ({ ...prev, [spotName]: result.imageUrl }));
            }
        } catch (error) {
            console.error('Failed to fetch image for:', spotName, error);
        } finally {
            setLoadingImages(prev => {
                const next = new Set(prev);
                next.delete(spotName);
                return next;
            });
        }
    }, [city, loadingImages]);

    // 预加载所有景点图片
    useEffect(() => {
        dailyPlan.forEach(day => {
            day.routes.forEach(route => {
                if (!spotImages[route.name] && !loadingImages.has(route.name)) {
                    fetchImage(route.name);
                }
            });
        });
    }, [dailyPlan, fetchImage, spotImages, loadingImages]);

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* 标题区域 */}
            <div className="shrink-0 p-6 border-b border-white/10 bg-gradient-to-r from-cyan-900/30 via-blue-900/20 to-purple-900/30">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-4xl animate-float">{dailyPlan[0]?.routes[0]?.emoji || '🌏'}</span>
                            <h2 className="text-2xl md:text-3xl font-bold text-white truncate">
                                {tripTitle || `${city}之旅`}
                            </h2>
                        </div>
                        {tripVibe && (
                            <p className="text-slate-400 text-sm line-clamp-2">{tripVibe}</p>
                        )}
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-2">
                        <span className="px-4 py-1.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-full text-cyan-300 text-sm font-bold">
                            {totalDays} 天行程
                        </span>
                        <span className="text-xs text-slate-500">
                            {dailyPlan.reduce((acc, day) => acc + day.routes.length, 0)} 个景点
                        </span>
                    </div>
                </div>
            </div>

            {/* 可滚动列表 */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-8">
                {dailyPlan.map((day, dayIndex) => {
                    const dayColor = dayColors[dayIndex % dayColors.length];

                    return (
                        <div key={day.day} className="relative animate-fade-in-up" style={{ animationDelay: `${dayIndex * 100}ms` }}>
                            {/* 天数 Header */}
                            <div className="sticky top-0 z-20 flex items-center gap-4 mb-6 bg-slate-900/95 backdrop-blur-xl py-3 px-4 -mx-4 rounded-xl border border-white/5">
                                <div
                                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg"
                                    style={{
                                        backgroundColor: dayColor,
                                        boxShadow: `0 8px 32px ${dayColor}40`
                                    }}
                                >
                                    D{day.day}
                                </div>
                                <div className="flex-1">
                                    <span className="text-white font-bold text-xl">第 {day.day} 天</span>
                                    {day.theme && (
                                        <p className="text-slate-400 text-sm">{day.theme}</p>
                                    )}
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-500" />
                            </div>

                            {/* 时间轴 + 卡片 */}
                            <div className="relative pl-6 ml-6 border-l-2 border-dashed space-y-6" style={{ borderColor: `${dayColor}40` }}>
                                {day.routes.map((route, routeIndex) => (
                                    <div
                                        key={routeIndex}
                                        className="relative group"
                                        onMouseEnter={() => onSpotHover?.(dayIndex, routeIndex)}
                                        onClick={() => onSpotClick?.(dayIndex, routeIndex, route)}
                                    >
                                        {/* 时间轴节点 */}
                                        <div
                                            className="absolute -left-[31px] top-6 w-4 h-4 rounded-full border-3 z-10 group-hover:scale-150 transition-all duration-300"
                                            style={{
                                                backgroundColor: dayColor,
                                                borderColor: '#0f172a',
                                                boxShadow: `0 0 20px ${dayColor}80`
                                            }}
                                        />

                                        {/* 卡片 */}
                                        <div className="bg-slate-800/50 hover:bg-slate-800/80 rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer border border-white/5 hover:border-white/20 group-hover:-translate-y-1 group-hover:shadow-2xl">
                                            {/* 卡片 Header: 图片 + 名称 */}
                                            <div className="relative h-40 overflow-hidden">
                                                {/* 背景图 */}
                                                {spotImages[route.name] ? (
                                                    <Image
                                                        src={spotImages[route.name]}
                                                        alt={route.name}
                                                        fill
                                                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                                                        sizes="(max-width: 768px) 100vw, 400px"
                                                    />
                                                ) : (
                                                    <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-800 animate-pulse" />
                                                )}

                                                {/* 渐变遮罩 */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />

                                                {/* 时间段标签 */}
                                                {route.time_period && (
                                                    <div className="absolute top-3 left-3 px-3 py-1 bg-black/50 backdrop-blur-sm rounded-full text-xs text-white flex items-center gap-1.5">
                                                        <span>{timePeriodIcons[route.time_period] || '📍'}</span>
                                                        <span>{route.time_period}</span>
                                                    </div>
                                                )}

                                                {/* 时长标签 */}
                                                {route.suggested_duration && (
                                                    <div className="absolute top-3 right-3 px-3 py-1 bg-black/50 backdrop-blur-sm rounded-full text-xs text-white flex items-center gap-1.5">
                                                        <Clock className="w-3 h-3" />
                                                        <span>{route.suggested_duration}</span>
                                                    </div>
                                                )}

                                                {/* 地点名称 */}
                                                <div className="absolute bottom-3 left-3 right-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-2xl">{route.emoji || '📍'}</span>
                                                        <h3 className="text-white font-bold text-lg line-clamp-1 group-hover:text-cyan-300 transition-colors">
                                                            {route.name}
                                                        </h3>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 卡片 Body */}
                                            <div className="p-4 space-y-4">
                                                {/* 描述 */}
                                                <p className="text-slate-400 text-sm leading-relaxed line-clamp-2">
                                                    {route.desc}
                                                </p>

                                                {/* Tags */}
                                                {route.tags && route.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {route.tags.map((tag, tagIndex) => (
                                                            <span
                                                                key={tagIndex}
                                                                className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-full text-xs text-cyan-400 border border-cyan-500/20 transition-colors"
                                                            >
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Footer: 美食、Tips、花费 */}
                                                <div className="pt-3 border-t border-white/5 space-y-2">
                                                    {/* 美食推荐 */}
                                                    {route.food_recommendation && (
                                                        <div className="flex items-start gap-2 text-sm">
                                                            <Utensils className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                                                            <span className="text-slate-300">{route.food_recommendation}</span>
                                                        </div>
                                                    )}

                                                    {/* Tips */}
                                                    {route.tips && (
                                                        <div className="flex items-start gap-2 text-sm p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                                                            <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                                            <span className="text-amber-200/90">{route.tips}</span>
                                                        </div>
                                                    )}

                                                    {/* 花费 */}
                                                    {route.cost !== undefined && route.cost > 0 && (
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <Coins className="w-4 h-4 text-emerald-400" />
                                                            <span className="text-slate-300">
                                                                预估花费 <span className="text-emerald-400 font-bold">¥{route.cost}</span>
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}

                {/* 结束标记 */}
                <div className="text-center py-8">
                    <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-full border border-white/10">
                        <span className="text-2xl">🎉</span>
                        <span className="text-slate-400">旅程规划完成</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
