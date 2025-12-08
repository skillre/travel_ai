'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronRight, CalendarDays } from 'lucide-react';
import { TripPlanDay, TripPlanItem } from '../types';
import { ItineraryCard } from './ItineraryCard';
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
        <div className="h-full flex flex-col">
            {/* 顶部统计栏 - Minimalist Border Bottom */}
            <div className="shrink-0 py-3 px-6 md:px-8 border-b border-slate-100 bg-white sticky top-0 z-30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">TOTAL</span>
                    <span className="text-slate-800 font-bold">{timeline.length} Days</span>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-md text-slate-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                        <span>{totalSpots} Spots</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-md text-slate-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                        <span>{totalFood} Foods</span>
                    </div>
                </div>
            </div>

            {/* 列表内容 (无需 scrollbar，由父级控制) */}
            <div className="flex-1 px-6 md:px-8 py-6 space-y-12">
                {timeline.map((day, dayIndex) => {
                    const dayColor = dayColors[dayIndex % dayColors.length];

                    return (
                        <div
                            key={day.day}
                            className="relative animate-fade-in-up"
                            style={{ animationDelay: `${dayIndex * 100}ms` }}
                        >
                            {/* Day Header - Clean Sticky */}
                            <div className="sticky top-[49px] z-20 flex items-center gap-4 mb-8 bg-white/95 backdrop-blur-sm py-4 -mx-2 px-2 border-b border-slate-50">
                                {/* 天数徽章 - Clean */}
                                <div className="flex flex-col items-center">
                                    <span className="text-xs text-slate-400 font-bold tracking-wider">DAY</span>
                                    <span className="text-3xl font-black text-slate-800 leading-none">{day.day}</span>
                                </div>

                                {/* 主题信息 */}
                                <div className="flex-1 min-w-0 pl-2 border-l-2 border-slate-100 ml-2">
                                    <h3 className="text-slate-800 font-bold text-lg truncate">
                                        {day.date_theme}
                                    </h3>
                                    <p className="text-slate-500 text-sm line-clamp-1 font-medium">
                                        {day.day_summary}
                                    </p>
                                </div>
                            </div>

                            {/* 时间轴线 */}
                            <div className="absolute left-[18px] top-[80px] bottom-0 w-0.5 bg-slate-100 z-0" />

                            {/* 时间轴 + 卡片列表 */}
                            <div className="relative space-y-8 pl-2">
                                {day.items.map((item, itemIndex) => (
                                    <ItineraryCard
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
                <div className="text-center py-12">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full text-slate-400 text-sm">
                        <span>End of Trip</span>
                        <span>✨</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
