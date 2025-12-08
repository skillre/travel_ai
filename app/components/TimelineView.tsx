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
const dayColors = [
    '#FF6B6B', // 珊瑚红
    '#4ECDC4', // 薄荷绿
    '#45B7D1', // 天空蓝
    '#96CEB4', // 草绿
    '#FFEAA7', // 柠檬黄
    '#DDA0DD', // 梅红
    '#98D8C8', // 碧绿
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
        <div className="h-full flex flex-col overflow-hidden">
            {/* 顶部统计栏 */}
            <div className="shrink-0 p-4 border-b border-white/10 bg-gradient-to-r from-slate-900/80 to-slate-800/80 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CalendarDays className="w-5 h-5 text-cyan-400" />
                        <span className="text-white font-semibold">{timeline.length} 天行程</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-cyan-400" />
                            <span className="text-slate-400">{totalSpots} 景点</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-orange-400" />
                            <span className="text-slate-400">{totalFood} 美食</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 可滚动时光轴 */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-8">
                {timeline.map((day, dayIndex) => {
                    const dayColor = dayColors[dayIndex % dayColors.length];

                    return (
                        <div
                            key={day.day}
                            className="relative animate-fade-in-up"
                            style={{ animationDelay: `${dayIndex * 100}ms` }}
                        >
                            {/* Day Header */}
                            <div className="sticky top-0 z-20 flex items-center gap-4 mb-6 bg-slate-900/95 backdrop-blur-xl py-3 px-4 -mx-4 rounded-xl border border-white/5">
                                {/* 天数徽章 */}
                                <div
                                    className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center text-white font-bold shadow-lg"
                                    style={{
                                        backgroundColor: dayColor,
                                        boxShadow: `0 8px 32px ${dayColor}40`,
                                    }}
                                >
                                    <span className="text-xs opacity-80">DAY</span>
                                    <span className="text-xl -mt-1">{day.day}</span>
                                </div>

                                {/* 主题信息 */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-bold text-xl truncate">
                                        {day.date_theme}
                                    </h3>
                                    <p className="text-slate-400 text-sm line-clamp-1">
                                        {day.day_summary}
                                    </p>
                                </div>

                                {/* 项目数量 */}
                                <div className="shrink-0 flex items-center gap-2">
                                    <span className="px-3 py-1 bg-white/5 rounded-full text-xs text-slate-400">
                                        {day.items.length} 项
                                    </span>
                                    <ChevronRight className="w-5 h-5 text-slate-500" />
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
                    <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-full border border-white/10">
                        <span className="text-2xl">🎉</span>
                        <span className="text-slate-400">旅程规划完成</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
