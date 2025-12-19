'use client';

import { memo } from 'react';
import Image from 'next/image';
import { TripPlanItem } from '../types';
import { useImage } from '../hooks/useImage';

interface ItemCardProps {
    item: TripPlanItem;
    city: string;
    dayColor: string;
    isFirst?: boolean;
    onHover?: () => void;
    onClick?: () => void;
}

/**
 * 图片骨架屏组件
 * 在图片加载时显示动画占位符
 */
function ImageSkeleton({ emoji }: { emoji: string }) {
    return (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 animate-pulse">
            {/* 渐变动画背景 */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skeleton-shimmer" />
            {/* 中心 Emoji 作为类型指示 */}
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl opacity-50 animate-bounce">{emoji}</span>
            </div>
        </div>
    );
}

/**
 * 图片加载错误占位符
 */
function ImageErrorPlaceholder({ emoji, onRetry }: { emoji: string; onRetry?: () => void }) {
    return (
        <div 
            className="absolute inset-0 bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors"
            onClick={onRetry}
        >
            <span className="text-3xl mb-1">{emoji}</span>
            {onRetry && (
                <span className="text-[10px] text-slate-400 hover:text-slate-600">
                    点击重试
                </span>
            )}
        </div>
    );
}

/**
 * 核心卡片组件
 * 根据 type (spot/food) 差异化渲染
 * 支持骨架屏和乐观 UI
 */
function ItemCardComponent({
    item,
    city,
    dayColor,
    isFirst = false,
    onHover,
    onClick,
}: ItemCardProps) {
    const isSpot = item.type === 'spot';
    const isFood = item.type === 'food';

    // 使用新的智能图片 Hook
    const { imageUrl, loadingState, retry } = useImage(
        item.title,
        city,
        item.type
    );

    // 如果有预解析的图片 URL（SSR），直接使用
    const displayUrl = item.resolvedImageUrl || imageUrl;
    const isLoading = !item.resolvedImageUrl && loadingState === 'loading';
    const hasError = !item.resolvedImageUrl && loadingState === 'error';

    return (
        <div
            className="group relative pl-12" // Timeline padding
            onMouseEnter={onHover}
            onClick={onClick}
        >
            {/* Timeline Dot */}
            <div className="absolute left-[13px] top-6 w-3 h-3 rounded-full bg-white border-2 border-slate-300 z-10 group-hover:scale-125 group-hover:border-teal-500 transition-all duration-300" />

            {/* Time Label (Floating Left) */}
            <div className="absolute left-[-4px] top-12 text-[10px] font-medium text-slate-400 w-10 text-center">
                {item.time_label.split(' ')[0]}
            </div>

            {/* Clean Card */}
            <div className={`
                relative bg-white rounded-xl border transition-all duration-300
                ${isFood ? 'border-orange-100 hover:border-orange-200 hover:bg-orange-50/30' : 'border-slate-100 hover:border-slate-300 hover:shadow-md'}
            `}>
                <div className="flex flex-col sm:flex-row h-full">
                    {/* Image Section (Fixed Width on Desktop) */}
                    <div className="relative w-full sm:w-40 h-32 sm:h-auto shrink-0 overflow-hidden sm:rounded-l-xl rounded-t-xl sm:rounded-tr-none bg-slate-50">
                        {/* 加载中：显示骨架屏 */}
                        {isLoading && <ImageSkeleton emoji={item.emoji} />}
                        
                        {/* 加载错误：显示错误占位符 */}
                        {hasError && !displayUrl && (
                            <ImageErrorPlaceholder emoji={item.emoji} onRetry={retry} />
                        )}
                        
                        {/* 图片加载成功 */}
                        {displayUrl && (
                            <Image
                                src={displayUrl}
                                alt={item.title}
                                fill
                                className={`
                                    object-cover transition-all duration-700 
                                    group-hover:scale-105
                                    ${isLoading ? 'opacity-0' : 'opacity-100'}
                                `}
                                sizes="(max-width: 640px) 100vw, 160px"
                                onError={() => {
                                    // 图片加载失败时的处理已在 hook 中完成
                                }}
                            />
                        )}
                        
                        {/* 无图片时显示 Emoji */}
                        {!displayUrl && !isLoading && !hasError && (
                            <div className="absolute inset-0 flex items-center justify-center text-3xl bg-gradient-to-br from-slate-50 to-slate-100">
                                {item.emoji}
                            </div>
                        )}
                        
                        {/* Type Badge */}
                        <div className={`
                            absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider z-10
                            ${isFood ? 'bg-white/90 text-orange-600 shadow-sm' : 'bg-white/90 text-slate-600 shadow-sm'}
                        `}>
                            {item.sub_title || (isFood ? 'Food' : 'Spot')}
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 p-4 flex flex-col justify-between">
                        <div>
                            <div className="flex items-start justify-between gap-2">
                                <h3 className={`font-bold text-lg leading-tight line-clamp-1 ${isFood ? 'text-slate-800' : 'text-slate-800 group-hover:text-teal-600'} transition-colors`}>
                                    {item.title}
                                </h3>
                                {item.cost > 0 && (
                                    <span className="shrink-0 text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-full">
                                        ¥{item.cost}
                                    </span>
                                )}
                            </div>

                            <p className="mt-2 text-sm text-slate-500 line-clamp-2 leading-relaxed">
                                {item.content.desc}
                            </p>
                        </div>

                        {/* Footer Items */}
                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                            {item.tags?.slice(0, 3).map((tag, i) => (
                                <span key={i} className="text-[10px] px-1.5 py-0.5 bg-slate-50 text-slate-400 rounded border border-slate-100">
                                    {tag}
                                </span>
                            ))}

                            {item.content.highlight_text && (
                                <div className={`ml-auto flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full ${isFood ? 'bg-orange-50 text-orange-600' : 'bg-amber-50 text-amber-600'}`}>
                                    <span>{isFood ? '🍽️' : '💡'}</span>
                                    <span className="truncate max-w-[120px]">{item.content.highlight_text}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// 使用 memo 优化性能
export const ItemCard = memo(ItemCardComponent);
export default ItemCard;
