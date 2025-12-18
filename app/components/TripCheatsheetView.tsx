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
// Helper component for loading images - 使用与 ItineraryCard 相同的 hook 确保图片一致
// 并支持 SSR 模式 (当传入 resolvedImageUrl 时不使用 Hook)
const SpotImage = ({ title, city, type, resolvedImageUrl }: { title: string, city: string, type: 'spot' | 'food', resolvedImageUrl?: string }) => {
    // 如果有预解析的图片 URL，直接使用（SSR 模式）
    if (resolvedImageUrl) {
        return (
            <img
                src={resolvedImageUrl}
                alt={title}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    display: 'block'
                }}
            />
        );
    }

    // 否则使用 Hook (客户端模式)
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
            // Use background-image for better html2canvas support with object-fit: cover
            <div
                className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: `url(${imageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
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

// 从 sub_title 提取建议停留时间的辅助函数
const extractStayDuration = (item: TripPlanItem): string => {
    if (!item.sub_title) return '';

    // 匹配格式: "建议游玩 2小时" 或 "建议用餐 1小时" 或 "游玩 2小时" 或 "2小时"
    const durationMatch = item.sub_title.match(/(?:建议[游玩用餐]*\s*)?(\d+[小时分钟]+)/);
    if (durationMatch) {
        return durationMatch[1];
    }

    // 匹配英文格式: "2h" 或 "30min"
    const englishMatch = item.sub_title.match(/(\d+)\s*(h|hour|min)/i);
    if (englishMatch) {
        const value = englishMatch[1];
        const unit = englishMatch[2].toLowerCase();
        if (unit === 'h' || unit === 'hour') {
            return `${value}小时`;
        } else if (unit === 'min') {
            return `${value}分钟`;
        }
    }

    return '';
};

export default function TripCheatsheetView({ tripPlan, className = '', id }: TripCheatsheetViewProps) {
    const totalDays = tripPlan.timeline.length;
    // Calculate minimum width based on number of days
    // Each day column is 320px, gap is 24px, plus 80px padding
    const minContainerWidth = (totalDays * 320) + ((totalDays - 1) * 24) + 80;

    return (
        // Main Container: Force horizontal layout for export
        <div
            id={id}
            data-export-container="true"
            className={`flex flex-row gap-6 p-10 bg-slate-50 items-start ${className}`}
            style={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'nowrap',
                gap: '24px',
                padding: '40px',
                width: 'fit-content',
                minWidth: `${minContainerWidth}px`,
                maxWidth: 'none',
                overflow: 'visible',
            }}
        >
            {tripPlan.timeline.map((day, index) => {
                const colorClass = dayColors[index % dayColors.length];
                const textClass = dayTextColors[index % dayTextColors.length];
                const bgClass = dayBgColors[index % dayBgColors.length];
                const spots = day.items.filter(i => i.type === 'spot');

                return (
                    <div
                        key={day.day}
                        data-day-column="true"
                        className="shrink-0 flex flex-col gap-4"
                        style={{
                            width: '320px',
                            minWidth: '320px',
                            maxWidth: '320px',
                            flexShrink: 0,
                            flexGrow: 0,
                        }}
                    >
                        {/* Day Header */}
                        <div className="flex flex-col gap-2 pb-3 border-b-4 border-slate-200">
                            <div className="flex items-center gap-2">
                                <span className={`text-3xl font-black ${textClass} opacity-20`}>DAY</span>
                                <span className={`text-4xl font-black ${textClass}`}>{day.day}</span>
                            </div>
                            <div className={`h-1 w-14 rounded-full ${bgClass.replace('bg-', 'bg-').replace('50', '500')}`}></div>
                            <h3 className="text-base font-bold text-slate-700 leading-snug mt-1 line-clamp-2 min-h-[2.5rem]">{day.day_summary}</h3>
                        </div>

                        {/* Simulated Map Node Chain - 增大圆点和文字 */}
                        <div className="flex items-center justify-between px-1 py-3">
                            <div className="w-full flex items-center justify-between relative">
                                {/* Connecting Line */}
                                <div className="absolute top-[10px] left-0 right-0 h-0.5 bg-slate-300 border-t-2 border-dashed border-slate-300" style={{ zIndex: 0 }}></div>

                                {/* Nodes - 显示前4个景点 */}
                                {spots.slice(0, 4).map((item, idx) => (
                                    <div key={idx} className="flex flex-col items-center gap-1.5 bg-slate-50 px-1" style={{ zIndex: 10 }}>
                                        <div
                                            className={`w-5 h-5 rounded-full border-2 border-white shadow-md ${bgClass.replace('bg-', 'bg-').replace('50', '500')}`}
                                            style={{ width: '20px', height: '20px' }}
                                        ></div>
                                        {/* 增大文字，允许两行 */}
                                        <span
                                            className="text-xs text-slate-700 font-bold max-w-[72px] text-center leading-tight"
                                            style={{
                                                fontSize: '12px',
                                                maxWidth: '72px',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                                wordBreak: 'break-all'
                                            }}
                                        >
                                            {item.title}
                                        </span>
                                    </div>
                                ))}
                                {/* 如果超过4个景点，显示数量 */}
                                {spots.length > 4 && (
                                    <div className="flex flex-col items-center gap-1.5 bg-slate-50 px-1" style={{ zIndex: 10 }}>
                                        <div
                                            className="w-5 h-5 rounded-full bg-slate-400 border-2 border-white shadow-md flex items-center justify-center"
                                            style={{ width: '20px', height: '20px' }}
                                        >
                                            <span className="text-[8px] text-white font-bold">+{spots.length - 4}</span>
                                        </div>
                                        <span className="text-xs text-slate-400 font-bold">更多</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Spots List */}
                        <div className="flex flex-col gap-0">
                            {day.items.map((item, itemIdx) => {
                                // 获取当前地点的建议停留时间
                                const stayDuration = extractStayDuration(item);

                                return (
                                    <div key={itemIdx} className="relative group">
                                        {/* Connector Line (except for last item) */}
                                        {itemIdx < day.items.length - 1 && (
                                            <div
                                                className="absolute left-7 top-[60px] bottom-[-16px] w-0.5 border-l-2 border-dashed border-slate-300"
                                                style={{ zIndex: 0 }}
                                            ></div>
                                        )}

                                        {/* Card - 使用 style 确保 html2canvas 正确渲染 */}
                                        <div
                                            className={`relative bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-6 ${colorClass} border-l-[5px]`}
                                            style={{
                                                zIndex: 10,
                                                minHeight: '210px',
                                                borderLeftWidth: '5px'
                                            }}
                                        >
                                            {/* Image Area - 固定高度，使用 style 确保渲染 */}
                                            <div
                                                className="w-full bg-slate-100 relative overflow-hidden"
                                                style={{ height: '120px', width: '100%', position: 'relative' }}
                                            >
                                                <SpotImage
                                                    title={item.title}
                                                    city={tripPlan.meta.city}
                                                    type={item.type}
                                                    resolvedImageUrl={item.resolvedImageUrl}
                                                />

                                                <div className="absolute top-2 right-2 flex gap-1" style={{ zIndex: 20 }}>
                                                    {item.cost === 0 && (
                                                        <span className="bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm flex items-center gap-0.5">
                                                            <Wallet size={9} /> 免费
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Type Badge */}
                                                <div
                                                    className={`absolute top-2 left-2 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide backdrop-blur-sm ${item.type === 'food' ? 'bg-orange-500/90 text-white' : 'bg-teal-500/90 text-white'}`}
                                                    style={{ zIndex: 20 }}
                                                >
                                                    {item.type === 'food' ? '美食' : '景点'}
                                                </div>
                                            </div>

                                            {/* Content Area */}
                                            <div className="p-3 flex flex-col">
                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                    <h4 className="font-bold text-slate-800 text-sm leading-tight line-clamp-1 flex-1">{item.title}</h4>
                                                    <div className="shrink-0 text-lg">{item.emoji}</div>
                                                </div>
                                                <p
                                                    className="text-[11px] text-slate-500 mb-2 leading-relaxed"
                                                    style={{
                                                        minHeight: '2rem',
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden'
                                                    }}
                                                >
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

                                        {/* 停留时间胶囊 - 放在卡片上方 */}
                                        {stayDuration && (
                                            <div
                                                className="absolute left-1/2 -translate-x-1/2 top-[-12px]"
                                                style={{ zIndex: 25 }}
                                            >
                                                <div className="bg-blue-50 border border-blue-200 text-blue-600 text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                                    <Clock size={9} />
                                                    <span>{stayDuration}</span>
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
