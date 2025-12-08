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
    const { imageUrl, isLoading: imageLoading } = useUnsplashImage(
        item.title,
        city,
        item.type
    );

    return (
        <div
            className="relative group"
            onMouseEnter={onHover}
            onClick={onClick}
        >
            {/* 时光轴节点 */}
            <div
                className="absolute -left-[31px] top-6 w-6 h-6 rounded-full flex items-center justify-center text-sm z-10 group-hover:scale-125 transition-all duration-300 shadow-lg"
                style={{
                    backgroundColor: dayColor,
                    boxShadow: `0 0 20px ${dayColor}60`,
                }}
            >
                {item.emoji}
            </div>

            {/* 卡片主体 */}
            <div
                className={`
                    rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer 
                    border group-hover:-translate-y-1 group-hover:shadow-2xl
                    ${isFood
                        ? 'bg-gradient-to-br from-orange-50/10 to-amber-50/5 border-orange-200/20 hover:border-orange-300/40'
                        : 'bg-slate-800/50 hover:bg-slate-800/80 border-white/5 hover:border-white/20'
                    }
                `}
            >
                {/* 卡片头部：图片区域 */}
                <div className={`relative overflow-hidden ${isSpot ? 'h-44' : 'h-32'}`}>
                    {isSpot ? (
                        // 景点：显示 Unsplash 图片
                        <>
                            {imageUrl ? (
                                <Image
                                    src={imageUrl}
                                    alt={item.title}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                                    sizes="(max-width: 768px) 100vw, 400px"
                                />
                            ) : (
                                <div className={`absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-800 ${imageLoading ? 'animate-pulse' : ''}`} />
                            )}
                            {/* 渐变遮罩 */}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                        </>
                    ) : (
                        // 餐饮：温暖渐变背景 + 大 Emoji
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 via-amber-400/15 to-yellow-300/10 flex items-center justify-center">
                            <span className="text-6xl animate-float filter drop-shadow-lg">
                                {item.emoji || '🍽️'}
                            </span>
                            {/* 装饰性气泡 */}
                            <div className="absolute top-4 right-4 w-16 h-16 bg-orange-300/10 rounded-full blur-xl" />
                            <div className="absolute bottom-4 left-4 w-12 h-12 bg-yellow-300/10 rounded-full blur-xl" />
                        </div>
                    )}

                    {/* 时间标签 */}
                    <div className={`
                        absolute top-3 left-3 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5
                        ${isFood
                            ? 'bg-orange-500/80 text-white backdrop-blur-sm'
                            : 'bg-black/50 text-white backdrop-blur-sm'
                        }
                    `}>
                        <Clock className="w-3 h-3" />
                        <span>{item.time_label}</span>
                    </div>

                    {/* 副标题标签 */}
                    {item.sub_title && (
                        <div className="absolute top-3 right-3 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full text-xs text-white/90">
                            {item.sub_title}
                        </div>
                    )}

                    {/* 标题区域 */}
                    <div className="absolute bottom-3 left-3 right-3">
                        <div className="flex items-center gap-2">
                            {isSpot && <span className="text-2xl">{item.emoji || '📍'}</span>}
                            <h3 className={`
                                font-bold text-lg line-clamp-1 transition-colors
                                ${isFood
                                    ? 'text-orange-100 group-hover:text-orange-200'
                                    : 'text-white group-hover:text-cyan-300'
                                }
                            `}>
                                {item.title}
                            </h3>
                        </div>
                    </div>
                </div>

                {/* 卡片内容区域 */}
                <div className="p-4 space-y-3">
                    {/* 描述 */}
                    <p className={`text-sm leading-relaxed line-clamp-2 ${isFood ? 'text-orange-200/70' : 'text-slate-400'}`}>
                        {item.content.desc}
                    </p>

                    {/* Tags */}
                    {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {item.tags.map((tag, tagIndex) => (
                                <span
                                    key={tagIndex}
                                    className={`
                                        px-3 py-1 rounded-full text-xs transition-colors
                                        ${isFood
                                            ? 'bg-orange-500/10 text-orange-300 border border-orange-500/20 hover:bg-orange-500/20'
                                            : 'bg-white/5 text-cyan-400 border border-cyan-500/20 hover:bg-white/10'
                                        }
                                    `}
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Highlight Box */}
                    {item.content.highlight_text && (
                        <div className={`
                            flex items-start gap-2 text-sm p-3 rounded-xl border
                            ${isFood
                                ? 'bg-orange-500/10 border-orange-500/20'
                                : 'bg-amber-500/10 border-amber-500/20'
                            }
                        `}>
                            <span className="shrink-0 mt-0.5">
                                {isFood ? '🍽️' : '⚠️'}
                            </span>
                            <div>
                                <span className={`font-semibold ${isFood ? 'text-orange-300' : 'text-amber-300'}`}>
                                    {item.content.highlight_label}:
                                </span>
                                <span className={`ml-1 ${isFood ? 'text-orange-200/90' : 'text-amber-200/90'}`}>
                                    {item.content.highlight_text}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Footer: 费用 */}
                    {item.cost > 0 && (
                        <div className="flex justify-end pt-2 border-t border-white/5">
                            <div className={`
                                flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                                ${isFood
                                    ? 'bg-orange-500/20 text-orange-300'
                                    : 'bg-emerald-500/20 text-emerald-400'
                                }
                            `}>
                                <Coins className="w-4 h-4" />
                                <span>¥{item.cost}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// 使用 memo 优化性能
export const ItemCard = memo(ItemCardComponent);
export default ItemCard;
