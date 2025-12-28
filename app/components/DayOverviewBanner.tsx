'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Layers, ChevronDown } from 'lucide-react';
import { TripPlanDay } from '../types';

interface DayOverviewBannerProps {
    city: string;
    days: number;
    totalSpots: number;
    totalFood: number;
    selectedDay: number | null;
    timeline: TripPlanDay[];
    onSelectDay: (index: number | null) => void;
    onExport?: () => void;
}

// 每天路线的颜色
const dayColors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#06b6d4', '#8b5cf6', '#ec4899',
];

export default function DayOverviewBanner({
    city,
    days,
    totalSpots,
    totalFood,
    selectedDay,
    timeline,
    onSelectDay,
    onExport
}: DayOverviewBannerProps) {
    const [isVisible, setIsVisible] = useState(true);
    const [isDragging, setIsDragging] = useState(false);
    const [translateY, setTranslateY] = useState(0);

    const startYRef = useRef(0);

    const handleTouchStart = (e: React.TouchEvent) => {
        startYRef.current = e.touches[0].clientY;
        setIsDragging(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        const currentY = e.touches[0].clientY;
        const deltaY = currentY - startYRef.current;
        // 只能向上拖
        if (deltaY < 0) {
            setTranslateY(deltaY);
        }
    };

    const handleTouchEnd = () => {
        if (!isDragging) return;
        setIsDragging(false);
        // 如果向上拖动超过 30px，则隐藏
        if (translateY < -30) {
            setIsVisible(false);
        }
        setTranslateY(0);
    };

    const toggleVisible = () => setIsVisible(!isVisible);

    return (
        <div className="absolute top-0 left-0 right-0 z-30 safe-area-top pointer-events-none">
            {/* 隐藏后的下拉条 */}
            <div
                className={`
                    absolute top-0 left-1/2 -translate-x-1/2 mt-2 
                    bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full shadow-md border border-white/50
                    pointer-events-auto transition-all duration-300 transform cursor-pointer
                    ${!isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
                `}
                onClick={() => setIsVisible(true)}
            >
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <span>📍 {city}</span>
                    <ChevronDown className="w-3 h-3" />
                </div>
            </div>

            {/* 主横幅 */}
            <div
                className={`
                    mx-3 mt-3 bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-white/50 pointer-events-auto
                    transition-all duration-300 ease-out transform
                    ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-[150%] opacity-0'}
                `}
                style={isDragging ? { transform: `translateY(${translateY}px)` } : {}}
            >
                <div className="px-3 py-2.5">
                    {/* 城市名称 + 统计数据 */}
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className="text-base">📍</span>
                            <h1 className="font-bold text-slate-800 text-sm leading-tight">{city}</h1>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                            <span className="font-bold text-slate-700">{days}</span>天
                            <span className="mx-0.5">·</span>
                            <span className="font-bold text-teal-600">{totalSpots}</span>景点
                            <span className="mx-0.5">·</span>
                            <span className="font-bold text-orange-600">{totalFood}</span>美食
                        </div>
                    </div>

                    {/* 天数切换按钮 + 导出按钮 */}
                    <div className="flex items-center">
                        {/* 日期按钮容器 - 可滚动 */}
                        <div className="flex-1 overflow-x-auto scrollbar-hide pr-1">
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => onSelectDay(null)}
                                    className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all touch-feedback ${selectedDay === null
                                        ? 'bg-slate-800 text-white shadow-sm'
                                        : 'bg-slate-100 text-slate-600'
                                        }`}
                                >
                                    <Layers className="w-3 h-3" />
                                    全部
                                </button>
                                {timeline.map((day, index) => (
                                    <button
                                        key={day.day}
                                        onClick={() => onSelectDay(index)}
                                        className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all touch-feedback ${selectedDay === index
                                            ? 'text-white shadow-sm'
                                            : 'bg-slate-100 text-slate-600'
                                            }`}
                                        style={selectedDay === index ? { backgroundColor: dayColors[index % dayColors.length] } : {}}
                                    >
                                        D{day.day}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        {/* 隔离线 + 导出按钮 - 固定在右侧 */}
                        <div className="flex items-center gap-1.5">
                            {/* 隔离线 */}
                            <div className="w-[1px] h-4 bg-slate-300 flex-shrink-0"></div>
                            
                            {/* 导出按钮 */}
                            {onExport && (
                                <button
                                    onClick={onExport}
                                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md shadow-md border border-white/50 text-indigo-600 font-bold text-xs hover:bg-slate-50 transition-all active:scale-95 touch-feedback flex-shrink-0"
                                    aria-label="导出行程"
                                >
                                    <span className="text-sm">🗺️</span>
                                    <span>导出</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* 底部拖拽条 */}
                <div
                    className="flex justify-center pb-1.5 pt-1 cursor-grab active:cursor-grabbing touch-none"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onClick={toggleVisible}
                >
                    <div className="w-8 h-1 bg-slate-200 rounded-full" />
                </div>
            </div>
        </div>
    );
}
