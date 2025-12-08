'use client';

import { memo } from 'react';
import Image from 'next/image';
import { MapPin, Clock, Coins } from 'lucide-react';
import { TripPlanItem } from '../types';
import { useUnsplashImage } from '../hooks/useUnsplashImage';

interface ItemCardProps {
    item: TripPlanItem;
    city: string;
    dayColor: string;
    isFirst?: boolean;
    onHover?: () => void;
    onClick?: () => void;
}

/**
 * 核心卡片组件
 * 根据 type (spot/food) 差异化渲染
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

    // 只对景点获取 Unsplash 图片
    const { imageUrl } = useUnsplashImage(
        item.title,
        city,
        item.type
    );

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
                        {imageUrl ? (
                            <Image
                                src={imageUrl}
                                alt={item.title}
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                                sizes="(max-width: 640px) 100vw, 160px"
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-3xl">
                                {item.emoji}
                            </div>
                        )}
                        {/* Type Badge */}
                        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isFood ? 'bg-white/90 text-orange-600 shadow-sm' : 'bg-white/90 text-slate-600 shadow-sm'}`}>
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
