'use client';

import { useCallback, useEffect } from 'react';
import { ChevronRight, CalendarDays } from 'lucide-react';
import { TripPlanDay, TripPlanItem } from '../types';
import { ItemCard } from './ItemCard';
import { preloadImages } from '../hooks/useUnsplashImage';

interface TimelineViewProps {
    timeline: TripPlanDay[];
    city: string;
    onItemHover?: (dayIndex: number, itemIndex: number) => void;
    onItemClick?: (dayIndex: number, itemIndex: number, item: TripPlanItem) => void;
}

// 每天路线的颜色
// 每天路线的颜色 - Gentle Palette
const dayColors = [
    '#95D9AD', // fresh-green-300
    '#9CCBE6', // tender-blue-300
    '#FFC8C8', // soft-pink-300
    '#EBE5D5', // cream-300 (Darker for contrast) -> maybe use a variation
    '#B8E6D3', // fresh-green-200
    '#C4E0F0', // tender-blue-200
    '#FFD7D7', // soft-pink-200
];

/**
 * 垂直时光轴组件
 * 展示每日行程，包含 Day Header 和 ItemCard 列表
 */
export default function TimelineView({
    timeline,
    city,
    onItemHover,
    onItemClick,
}: TimelineViewProps) {

    // 预加载所有景点图片
    useEffect(() => {
        const allItems = timeline.flatMap(day =>
            day.items.map(item => ({ title: item.title, type: item.type }))
        );
        preloadImages(allItems, city);
    }, [timeline, city]);

    const handleItemHover = useCallback((dayIndex: number, itemIndex: number) => {
        onItemHover?.(dayIndex, itemIndex);
    }, [onItemHover]);

    const handleItemClick = useCallback((dayIndex: number, itemIndex: number, item: TripPlanItem) => {
        onItemClick?.(dayIndex, itemIndex, item);
    }, [onItemClick]);

    // 统计信息
    const totalSpots = timeline.reduce(
        (acc, day) => acc + day.items.filter(item => item.type === 'spot').length,
        0
    );
    const totalFood = timeline.reduce(
        (acc, day) => acc + day.items.filter(item => item.type === 'food').length,
        0
    );

    return (
        <div className="h-full flex flex-col overflow-hidden bg-white/30 backdrop-blur-sm">
            {/* 顶部统计栏 - Light Glass */}
            <div className="shrink-0 p-4 border-b border-white/60 bg-white/60 backdrop-blur-xl shadow-sm z-30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CalendarDays className="w-5 h-5 text-tender-blue-500" />
                        <span className="text-slate-700 font-bold">{timeline.length} 天行程</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm font-medium">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-tender-blue-400" />
                            <span className="text-slate-500">{totalSpots} 景点</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-orange-400" />
                            <span className="text-slate-500">{totalFood} 美食</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 可滚动时光轴 */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-8">
                {timeline.map((day, dayIndex) => {
                    const dayColor = dayColors[dayIndex % dayColors.length]; // You might want to update dayColors palette too

                    return (
                        <div
                            key={day.day}
                            className="relative animate-fade-in-up"
                            style={{ animationDelay: `${dayIndex * 100}ms` }}
                        >
                            {/* Day Header - Floating Glass */}
                            <div className="sticky top-0 z-20 flex items-center gap-4 mb-6 bg-white/90 backdrop-blur-xl py-3 px-4 -mx-4 rounded-xl border border-white/60 shadow-soft">
                                {/* 天数徽章 */}
                                <div
                                    className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center text-white font-bold shadow-lg transform transition-transform hover:scale-105"
                                    style={{
                                        backgroundColor: dayColor,
                                        boxShadow: `0 8px 20px -4px ${dayColor}60`,
                                    }}
                                >
                                    <span className="text-[10px] opacity-90 uppercase tracking-wider">DAY</span>
                                    <span className="text-2xl -mt-1 font-black">{day.day}</span>
                                </div>

                                {/* 主题信息 */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-slate-800 font-bold text-lg truncate">
                                        {day.date_theme}
                                    </h3>
                                    <p className="text-slate-500 text-sm line-clamp-1 font-medium">
                                        {day.day_summary}
                                    </p>
                                </div>

                                {/* 项目数量 */}
                                <div className="shrink-0 flex items-center gap-2">
                                    <span className="px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-500 font-medium">
                                        {day.items.length} 项
                                    </span>
                                    <ChevronRight className="w-5 h-5 text-slate-400" />
                                </div>
                            </div>

                            {/* 时间轴 + 卡片列表 */}
                            <div
                                className="relative pl-6 ml-6 border-l-2 border-dashed space-y-6"
                                style={{ borderColor: `${dayColor}40` }}
                            >
                                {day.items.map((item, itemIndex) => (
                                    <ItemCard
                                        key={itemIndex}
                                        item={item}
                                        city={city}
                                        dayColor={dayColor}
                                        isFirst={itemIndex === 0}
                                        onHover={() => handleItemHover(dayIndex, itemIndex)}
                                        onClick={() => handleItemClick(dayIndex, itemIndex, item)}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}

                {/* 结束标记 */}
                <div className="text-center py-8">
                    <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/60 rounded-full border border-white/60 shadow-sm">
                        <span className="text-2xl animate-bounce">🎉</span>
                        <span className="text-slate-500 font-medium">旅程规划完成</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
