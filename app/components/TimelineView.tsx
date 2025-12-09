'use client';

import { useCallback, useEffect } from 'react';
import { TripPlanDay, TripPlanItem } from '../types';
import { ItineraryCard } from './ItineraryCard';
import { preloadImages } from '../hooks/useUnsplashImage';

interface TimelineViewProps {
    timeline: TripPlanDay[];
    city: string;
    selectedDay?: number | null; // null = 显示全部天
    onItemHover?: (dayIndex: number, itemIndex: number) => void;
    onItemClick?: (dayIndex: number, itemIndex: number, item: TripPlanItem) => void;
}

// 每天路线的颜色
const dayColors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#06b6d4', '#8b5cf6', '#ec4899',
];

/**
 * 垂直时光轴组件
 * 支持按天筛选显示
 */
export default function TimelineView({
    timeline,
    city,
    selectedDay = null,
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

    // 根据选中的天筛选显示
    const visibleTimeline = selectedDay !== null
        ? timeline.filter((day, index) => index === selectedDay)
        : timeline;

    return (
        <div className="h-full flex flex-col">
            {/* 列表内容 */}
            <div className="flex-1 px-4 md:px-6 py-4 space-y-8">
                {visibleTimeline.map((day, filteredIndex) => {
                    // 获取原始索引以保持颜色一致
                    const originalDayIndex = timeline.findIndex(d => d.day === day.day);
                    const dayColor = dayColors[originalDayIndex % dayColors.length];

                    return (
                        <div
                            key={day.day}
                            className="relative animate-fade-in-up"
                            style={{ animationDelay: `${filteredIndex * 100}ms` }}
                        >
                            {/* Day Header - 简洁设计 (Sticky) */}
                            <div className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-sm -mx-4 md:-mx-6 px-4 md:px-6 py-3 flex items-center gap-3 mb-4 transition-all duration-300 border-b border-transparent data-[stuck=true]:border-slate-200 data-[stuck=true]:shadow-sm">
                                {/* 天数徽章 */}
                                <div
                                    className="flex items-center justify-center w-12 h-12 rounded-xl text-white font-bold shadow-md"
                                    style={{ backgroundColor: dayColor }}
                                >
                                    <div className="text-center">
                                        <span className="text-[10px] block leading-none opacity-80">DAY</span>
                                        <span className="text-xl leading-none">{day.day}</span>
                                    </div>
                                </div>

                                {/* 主题信息 */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-slate-800 font-bold text-base leading-tight">
                                        {day.date_theme}
                                    </h3>
                                    <p className="text-slate-500 text-sm mt-0.5 line-clamp-2">
                                        {day.day_summary}
                                    </p>
                                </div>
                            </div>

                            {/* 时间轴线 */}
                            <div
                                className="absolute left-[22px] top-[70px] bottom-0 w-0.5 z-0"
                                style={{ backgroundColor: `${dayColor}30` }}
                            />

                            {/* 卡片列表 */}
                            <div className="relative space-y-4 pl-1">
                                {day.items.map((item, itemIndex) => (
                                    <ItineraryCard
                                        key={itemIndex}
                                        item={item}
                                        city={city}
                                        dayColor={dayColor}
                                        isFirst={itemIndex === 0}
                                        onHover={() => handleItemHover(originalDayIndex, itemIndex)}
                                        onClick={() => handleItemClick(originalDayIndex, itemIndex, item)}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}

                {/* 结束标记 */}
                <div className="text-center py-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full text-slate-400 text-sm">
                        <span>行程结束</span>
                        <span>✨</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
