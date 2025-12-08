'use client';

import { memo, useState } from 'react';
import Image from 'next/image';
import { Clock, MapPin } from 'lucide-react';
import { TripPlanItem } from '../types';
import { useUnsplashImage } from '../hooks/useUnsplashImage';

interface ItineraryCardProps {
    item: TripPlanItem;
    city: string;
    dayColor: string;
    isFirst?: boolean;
    isActive?: boolean;
    onHover?: () => void;
    onClick?: () => void;
}

/**
 * 新版行程卡片组件 - 左图右文布局
 * 特点:
 * - 固定宽高的左侧图片区域
 * - 右侧内容区域包含标题、元数据、标签、提示
 * - 图片加载失败时显示优雅的占位符
 */
function ItineraryCardComponent({
    item,
    city,
    dayColor,
    isFirst = false,
    isActive = false,
    onHover,
    onClick,
}: ItineraryCardProps) {
    const isFood = item.type === 'food';
    const [imgError, setImgError] = useState(false);

    // 获取图片
    const { imageUrl, isLoading: imgLoading } = useUnsplashImage(
        item.title,
        city,
        item.type
    );

    // 处理图片加载错误
    const handleImageError = () => {
        setImgError(true);
    };

    // 从 sub_title 中提取时长信息
    const durationMatch = item.sub_title?.match(/(\d+[小时分钟]+)/);
    const duration = durationMatch ? durationMatch[1] : null;

    return (
        <div
            className={`
                group relative pl-10 cursor-pointer
                transition-all duration-200
                ${isActive ? 'scale-[1.02]' : ''}
            `}
            onMouseEnter={onHover}
            onClick={onClick}
        >
            {/* Timeline Dot */}
            <div
                className={`
                    absolute left-[11px] top-8 w-3.5 h-3.5 rounded-full z-10
                    border-2 transition-all duration-300
                    ${isActive
                        ? 'bg-teal-500 border-teal-500 scale-125'
                        : isFood
                            ? 'bg-white border-orange-400 group-hover:border-orange-500 group-hover:scale-110'
                            : 'bg-white border-teal-400 group-hover:border-teal-500 group-hover:scale-110'
                    }
                `}
            />

            {/* Time Label (Floating Left) */}
            <div className="absolute left-[-2px] top-14 text-[10px] font-semibold text-slate-400 w-8 text-center">
                {item.time_label.split(' ')[0]}
            </div>

            {/* 左图右文卡片 */}
            <div
                className={`
                    relative bg-white rounded-xl border overflow-hidden
                    transition-all duration-300
                    ${isActive
                        ? 'border-teal-400 shadow-lg shadow-teal-100'
                        : isFood
                            ? 'border-orange-100 hover:border-orange-200 hover:shadow-md'
                            : 'border-slate-100 hover:border-slate-200 hover:shadow-md'
                    }
                `}
            >
                <div className="flex">
                    {/* 左侧图片区域 - 固定尺寸 */}
                    <div className="relative w-24 h-28 sm:w-28 sm:h-32 shrink-0 bg-slate-100">
                        {!imgError && imageUrl ? (
                            <Image
                                src={imageUrl}
                                alt={item.title}
                                fill
                                className="object-cover"
                                sizes="(max-width: 640px) 96px, 112px"
                                onError={handleImageError}
                            />
                        ) : (
                            // 优雅的占位符
                            <div className={`
                                absolute inset-0 flex flex-col items-center justify-center
                                ${isFood ? 'bg-orange-50' : 'bg-slate-50'}
                            `}>
                                <span className="text-3xl mb-1">{item.emoji || (isFood ? '🍽️' : '🏞️')}</span>
                                <span className="text-[10px] text-slate-400">{isFood ? '美食推荐' : '精选景点'}</span>
                            </div>
                        )}

                        {/* 图片加载中状态 */}
                        {imgLoading && !imgError && (
                            <div className="absolute inset-0 bg-slate-100 animate-pulse" />
                        )}

                        {/* 类型角标 */}
                        <div
                            className={`
                                absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px]
                                font-bold uppercase tracking-wider backdrop-blur-sm
                                ${isFood
                                    ? 'bg-orange-500/90 text-white'
                                    : 'bg-teal-500/90 text-white'
                                }
                            `}
                        >
                            {isFood ? '美食' : '景点'}
                        </div>
                    </div>

                    {/* 右侧内容区域 */}
                    <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between min-w-0">
                        {/* 上部分：标题和费用 */}
                        <div>
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                                <h3
                                    className={`
                                        font-bold text-[15px] sm:text-base leading-snug line-clamp-1
                                        transition-colors
                                        ${isActive
                                            ? 'text-teal-600'
                                            : 'text-slate-800 group-hover:text-teal-600'
                                        }
                                    `}
                                >
                                    {item.title}
                                </h3>
                                {item.cost > 0 && (
                                    <span className="shrink-0 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                        ¥{item.cost}
                                    </span>
                                )}
                            </div>

                            {/* Meta Row: 时间 + 时长 */}
                            <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                                <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span>{item.time_label}</span>
                                </div>
                                {duration && (
                                    <div className="flex items-center gap-1">
                                        <span className="text-slate-300">•</span>
                                        <span>{duration}</span>
                                    </div>
                                )}
                            </div>

                            {/* Tags - flex wrap */}
                            {item.tags && item.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                    {item.tags.slice(0, 4).map((tag, i) => (
                                        <span
                                            key={i}
                                            className={`
                                                text-[10px] px-1.5 py-0.5 rounded
                                                ${isFood
                                                    ? 'bg-orange-50 text-orange-600 border border-orange-100'
                                                    : 'bg-slate-50 text-slate-500 border border-slate-100'
                                                }
                                            `}
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                    {item.tags.length > 4 && (
                                        <span className="text-[10px] text-slate-400">
                                            +{item.tags.length - 4}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 底部：Highlight/Tips - 淡色背景块 */}
                        {item.content.highlight_text && (
                            <div
                                className={`
                                    mt-auto p-2 rounded-lg text-xs leading-relaxed
                                    ${isFood
                                        ? 'bg-orange-50 text-orange-700'
                                        : 'bg-sky-50 text-sky-700'
                                    }
                                `}
                            >
                                <div className="flex items-start gap-1.5">
                                    <span className="shrink-0 mt-0.5">{isFood ? '🍽️' : '💡'}</span>
                                    <span className="line-clamp-2">{item.content.highlight_text}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// 使用 memo 优化性能
export const ItineraryCard = memo(ItineraryCardComponent);
export default ItineraryCard;
