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
                className="absolute -left-[31px] top-6 w-6 h-6 rounded-full flex items-center justify-center text-sm z-10 group-hover:scale-125 transition-all duration-300 shadow-md bg-white border-2"
                style={{
                    borderColor: dayColor,
                    color: dayColor,
                    boxShadow: `0 0 15px ${dayColor}40`,
                }}
            >
                {item.emoji}
            </div>

            {/* 卡片主体 */}
            <div
                className={`
                    rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer 
                    border group-hover:-translate-y-1 group-hover:shadow-xl
                    ${isFood
                        ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-100 hover:border-orange-200'
                        : 'bg-white hover:bg-white border-slate-100 hover:border-slate-200 shadow-sm'
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
                                    src={imageUrl!}
                                    alt={item.title}
                                    fill
                                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                                    sizes="(max-width: 768px) 100vw, 400px"
                                />
                            ) : (
                                <div className={`absolute inset-0 bg-slate-100 ${imageLoading ? 'animate-pulse' : ''}`} />
                            )}
                            {/* 渐变遮罩 - 底部加深以显示文字 */}
                            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
                        </>
                    ) : (
                        // 餐饮：温暖渐变背景 + 大 Emoji
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-100/50 via-amber-100/30 to-yellow-50/20 flex items-center justify-center">
                            <span className="text-6xl animate-float filter drop-shadow-sm transform group-hover:rotate-12 transition-transform duration-500">
                                {item.emoji || '🍽️'}
                            </span>
                            {/* 装饰性气泡 */}
                            <div className="absolute top-4 right-4 w-16 h-16 bg-orange-200/20 rounded-full blur-xl animate-float-slow" />
                            <div className="absolute bottom-4 left-4 w-12 h-12 bg-yellow-200/20 rounded-full blur-xl animate-float-delayed" />
                        </div>
                    )}

                    {/* 时间标签 */}
                    <div className={`
                        absolute top-3 left-3 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-sm
                        ${isFood
                            ? 'bg-white/80 text-orange-600 backdrop-blur-md'
                            : 'bg-white/90 text-slate-700 backdrop-blur-md'
                        }
                    `}>
                        <Clock className="w-3 h-3" />
                        <span>{item.time_label}</span>
                    </div>

                    {/* 副标题标签 */}
                    {item.sub_title && (
                        <div className="absolute top-3 right-3 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full text-xs text-white font-medium">
                            {item.sub_title}
                        </div>
                    )}

                    {/* 标题区域 */}
                    <div className="absolute bottom-3 left-3 right-3">
                        <div className="flex items-center gap-2">
                            {isSpot && <span className="text-2xl filter drop-shadow-sm">{item.emoji || '📍'}</span>}
                            <h3 className={`
                                font-bold text-lg line-clamp-1 transition-colors drop-shadow-sm
                                ${isFood
                                    ? 'text-orange-900 group-hover:text-orange-700'
                                    : 'text-white group-hover:text-tender-blue-100'
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
                    <p className={`text-sm leading-relaxed line-clamp-2 ${isFood ? 'text-orange-800/70' : 'text-slate-500'}`}>
                        {item.content.desc}
                    </p>

                    {/* Tags */}
                    {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {item.tags.map((tag, tagIndex) => (
                                <span
                                    key={tagIndex}
                                    className={`
                                        px-3 py-1 rounded-full text-xs transition-colors font-medium
                                        ${isFood
                                            ? 'bg-orange-100 text-orange-600 border border-orange-200 hover:bg-orange-200'
                                            : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-tender-blue-600'
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
                                ? 'bg-orange-50 border-orange-100'
                                : 'bg-amber-50 border-amber-100'
                            }
                        `}>
                            <span className="shrink-0 mt-0.5">
                                {isFood ? '🍽️' : '⚠️'}
                            </span>
                            <div>
                                <span className={`font-semibold ${isFood ? 'text-orange-700' : 'text-amber-700'}`}>
                                    {item.content.highlight_label}:
                                </span>
                                <span className={`ml-1 ${isFood ? 'text-orange-600' : 'text-amber-600'}`}>
                                    {item.content.highlight_text}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Footer: 费用 */}
                    {item.cost > 0 && (
                        <div className={`flex justify-end pt-2 border-t ${isFood ? 'border-orange-100' : 'border-slate-100'}`}>
                            <div className={`
                                flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold
                                ${isFood
                                    ? 'bg-orange-100 text-orange-600'
                                    : 'bg-emerald-50 text-emerald-600'
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
