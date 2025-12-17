'use client';

import React from 'react';
import { Clock, Camera, Wallet, Utensils, Loader2 } from 'lucide-react';
import { TripPlan, TripPlanItem } from '../types';
import { useUnsplashImage } from '../hooks/useUnsplashImage';

interface TripCheatsheetViewProps {
    tripPlan: TripPlan;
    className?: string;
    id?: string; // ID for html2canvas
}

// Helper component for loading images - 使用与 ItineraryCard 相同的 hook 确保图片一致
const SpotImage = ({ title, city, type }: { title: string, city: string, type: 'spot' | 'food' }) => {
    const { imageUrl, isLoading } = useUnsplashImage(title, city, type);

    if (isLoading) {
        return (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50 text-slate-300">
                <Loader2 className="w-6 h-6 animate-spin" />
            </div>
        );
    }

    if (imageUrl) {
        return (
            // Use standard img tag for html2canvas compatibility (Next.js Image can be tricky with external domains + canvas)
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={imageUrl}
                alt={title}
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
                crossOrigin="anonymous" // CRITICAL for html2canvas
            />
        );
    }

    // Fallback
    return (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 text-slate-300">
            {type === 'food' ? <Utensils size={32} /> : <Camera size={32} />}
        </div>
    );
};

const dayColors = [
    'border-red-500', 'border-orange-500', 'border-yellow-500', 'border-green-500',
    'border-cyan-500', 'border-violet-500', 'border-pink-500',
];

const dayTextColors = [
    'text-red-600', 'text-orange-600', 'text-yellow-600', 'text-green-600',
    'text-cyan-600', 'text-violet-600', 'text-pink-600',
];

const dayBgColors = [
    'bg-red-50', 'bg-orange-50', 'bg-yellow-50', 'bg-green-50',
    'bg-cyan-50', 'bg-violet-50', 'bg-pink-50',
];

// 从 sub_title 提取交通/距离信息的辅助函数
const extractTravelInfo = (nextItem?: TripPlanItem): string => {
    if (!nextItem || !nextItem.sub_title) return '';

    // 尝试从 sub_title 中提取距离/时间信息
    // 格式示例: "距上一站步行 300m" 或 "距上一站车程 15分钟" 或 "建议游玩 2小时"
    const distanceMatch = nextItem.sub_title.match(/(步行|车程|骑行|驾车)?\s*(\d+)\s*(m|km|米|公里|分钟|min)/i);
    if (distanceMatch) {
        const value = distanceMatch[2];
        const unit = distanceMatch[3].toLowerCase();

        // 统一转换为易读格式
        if (unit === 'm' || unit === '米') {
            return `${value}m`;
        } else if (unit === 'km' || unit === '公里') {
            return `${value}km`;
        } else if (unit === '分钟' || unit === 'min') {
            return `${value}min`;
        }
        return `${value}${unit}`;
    }

    // 默认不显示
    return '';
};

export default function TripCheatsheetView({ tripPlan, className = '', id }: TripCheatsheetViewProps) {
    return (
        // Main Container: Force horizontal layout even on mobile for export
        <div
            id={id}
            className={`flex flex-row gap-6 p-10 bg-slate-50 min-w-max items-start ${className}`}
        >
            {tripPlan.timeline.map((day, index) => {
                const colorClass = dayColors[index % dayColors.length];
                const textClass = dayTextColors[index % dayTextColors.length];
                const bgClass = dayBgColors[index % dayBgColors.length];

                return (
                    <div key={day.day} className="w-[300px] shrink-0 flex flex-col gap-4">
                        {/* Day Header */}
                        <div className="flex flex-col gap-2 pb-3 border-b-4 border-slate-200">
                            <div className="flex items-center gap-2">
                                <span className={`text-3xl font-black ${textClass} opacity-20`}>DAY</span>
                                <span className={`text-4xl font-black ${textClass}`}>{day.day}</span>
                            </div>
                            <div className={`h-1 w-14 rounded-full ${bgClass.replace('bg-', 'bg-').replace('50', '500')}`}></div>
                            <h3 className="text-base font-bold text-slate-700 leading-snug mt-1 line-clamp-2 min-h-[2.5rem]">{day.day_summary}</h3>
                        </div>

                        {/* Simulated Map Node Chain */}
                        <div className="flex items-center justify-between px-2 py-3">
                            <div className="w-full flex items-center justify-between relative">
                                {/* Connecting Line */}
                                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-300 -z-10 border-t-2 border-dashed border-slate-300"></div>

                                {/* Nodes (Take first 3 spots for brevity) */}
                                {day.items.filter(i => i.type === 'spot').slice(0, 3).map((item, idx) => (
                                    <div key={idx} className="flex flex-col items-center gap-1 bg-slate-50 px-1 z-10">
                                        <div className={`w-3 h-3 rounded-full border-2 border-white shadow-md ${bgClass.replace('bg-', 'bg-').replace('50', '500')}`}></div>
                                        {/* Improved Text Visibility */}
                                        <span className="text-[10px] text-slate-700 font-bold max-w-[70px] truncate text-center leading-tight drop-shadow-sm">
                                            {item.title}
                                        </span>
                                    </div>
                                ))}
                                {day.items.filter(i => i.type === 'spot').length > 3 && (
                                    <div className="flex flex-col items-center gap-1 bg-slate-50 px-1 z-10">
                                        <div className="w-3 h-3 rounded-full bg-slate-300 border-2 border-white shadow-md"></div>
                                        <span className="text-[10px] text-slate-400 font-bold">...</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Spots List */}
                        <div className="flex flex-col gap-0">
                            {day.items.map((item, itemIdx) => {
                                // 获取下一个项目的交通信息
                                const nextItem = day.items[itemIdx + 1];
                                const travelInfo = extractTravelInfo(nextItem);

                                return (
                                    <div key={itemIdx} className="relative group">
                                        {/* Connector Line (except for last item) */}
                                        {itemIdx < day.items.length - 1 && (
                                            <div className="absolute left-7 top-[56px] bottom-[-16px] w-0.5 border-l-2 border-dashed border-slate-300 z-0"></div>
                                        )}

                                        {/* Card - 统一高度 */}
                                        <div className={`relative z-10 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-6 ${colorClass} border-l-[5px] min-h-[200px]`}>
                                            {/* Image Area - 固定高度 */}
                                            <div className="h-28 w-full bg-slate-100 relative overflow-hidden shrink-0">
                                                <SpotImage
                                                    title={item.title}
                                                    city={tripPlan.meta.city}
                                                    type={item.type}
                                                />

                                                <div className="absolute top-2 right-2 flex gap-1 z-20">
                                                    {item.cost === 0 && (
                                                        <span className="bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm flex items-center gap-0.5">
                                                            <Wallet size={9} /> 免费
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Type Badge */}
                                                <div className={`absolute top-2 left-2 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide backdrop-blur-sm z-20 ${item.type === 'food' ? 'bg-orange-500/90 text-white' : 'bg-teal-500/90 text-white'}`}>
                                                    {item.type === 'food' ? '美食' : '景点'}
                                                </div>
                                            </div>

                                            {/* Content Area - 固定内部结构 */}
                                            <div className="p-3 flex flex-col">
                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                    <h4 className="font-bold text-slate-800 text-sm leading-tight line-clamp-1 flex-1">{item.title}</h4>
                                                    <div className="shrink-0 text-lg">{item.emoji}</div>
                                                </div>
                                                <p className="text-[11px] text-slate-500 line-clamp-2 mb-2 leading-relaxed min-h-[2rem]">
                                                    {item.content?.desc || item.sub_title}
                                                </p>

                                                {/* Tags */}
                                                <div className="flex flex-wrap gap-1">
                                                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[9px] rounded font-medium">
                                                        {item.time_label}
                                                    </span>
                                                    {item.tags?.slice(0, 2).map(tag => (
                                                        <span key={tag} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] rounded font-medium">
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Connector Badge (Travel Time) - 使用实际数据 */}
                                        {itemIdx < day.items.length - 1 && travelInfo && (
                                            <div className="absolute left-1/2 -translate-x-1/2 bottom-[-10px] z-20">
                                                <div className="bg-slate-100 border border-slate-200 text-slate-500 text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">
                                                    <Clock size={9} />
                                                    <span>{travelInfo}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
