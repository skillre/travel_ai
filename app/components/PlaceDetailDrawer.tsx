'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { X, MapPin, Clock, Tag, Share2, Heart, ExternalLink } from 'lucide-react';
import { TripPlanItem } from '../types';
import { useUnsplashImage } from '../hooks/useUnsplashImage';

interface PlaceDetailDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    item: TripPlanItem | null;
    city: string;
}

export default function PlaceDetailDrawer({
    isOpen,
    onClose,
    item,
    city,
}: PlaceDetailDrawerProps) {
    const isFood = item?.type === 'food';
    const [isVisible, setIsVisible] = useState(false);

    // 动画控制
    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // 获取图片
    const { imageUrl } = useUnsplashImage(
        item?.title || '',
        city,
        item?.type || 'spot'
    );

    if (!item && !isVisible) return null;

    // 提取时长
    const durationMatch = item?.sub_title?.match(/(\d+[小时分钟]+)/);
    const duration = durationMatch ? durationMatch[1] : '建议游玩相关时长';

    return (
        <div
            className={`
                absolute top-4 right-4 bottom-4 w-[380px] z-[1000]
                transform transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : 'translate-x-[420px]'}
            `}
            style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
        >
            <div className="h-full w-full bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-100">
                {/* 顶部图片区域 */}
                <div className="relative h-48 bg-slate-100 shrink-0">
                    {imageUrl ? (
                        <Image
                            src={imageUrl}
                            alt={item?.title || ''}
                            fill
                            className="object-cover"
                            priority
                        />
                    ) : (
                        <div className={`absolute inset-0 flex items-center justify-center text-4xl ${isFood ? 'bg-orange-50' : 'bg-teal-50'}`}>
                            {item?.emoji}
                        </div>
                    )}

                    {/* 关闭按钮 */}
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* 类型标签 */}
                    <div className={`
                        absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md
                        ${isFood
                            ? 'bg-orange-500/90 text-white shadow-sm'
                            : 'bg-teal-500/90 text-white shadow-sm'
                        }
                    `}>
                        {isFood ? '美食推荐' : '景点详情'}
                    </div>
                </div>

                {/* 内容滚动区域 */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-5 space-y-6">
                        {/* 标题部分 */}
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 leading-tight">
                                {item?.title}
                            </h2>
                            <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">
                                    {item?.time_label}
                                </span>
                                {item?.cost ? (
                                    <span className="text-emerald-600 font-medium price-tag">
                                        ¥{item.cost}/人
                                    </span>
                                ) : (
                                    <span className="text-slate-400">免费</span>
                                )}
                            </div>
                        </div>

                        {/* 标签 */}
                        {item?.tags && item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {item.tags.map((tag, i) => (
                                    <span
                                        key={i}
                                        className="px-2.5 py-1 bg-slate-50 text-slate-500 text-xs rounded-full border border-slate-100"
                                    >
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* 描述 */}
                        <div className="prose prose-sm prose-slate">
                            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                                <span className="text-lg">📝</span> 简介
                            </h3>
                            <p className="text-slate-600 leading-relaxed text-[15px]">
                                {item?.content.desc}
                            </p>
                        </div>

                        {/* 亮点/避坑 */}
                        {item?.content.highlight_text && (
                            <div className={`
                                p-4 rounded-xl text-sm leading-relaxed
                                ${isFood
                                    ? 'bg-orange-50 text-orange-800 border border-orange-100'
                                    : 'bg-sky-50 text-sky-800 border border-sky-100'
                                }
                            `}>
                                <div className="flex gap-2">
                                    <span className="shrink-0 text-lg">
                                        {isFood ? '😋' : '💡'}
                                    </span>
                                    <div>
                                        <p className="font-bold mb-1">
                                            {isFood ? '必点推荐' : '游玩亮点'}
                                        </p>
                                        <p className="opacity-90">
                                            {item.content.highlight_text}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 信息列表 */}
                        <div className="space-y-3 pt-2 border-t border-slate-100">
                            {duration && (
                                <div className="flex items-center gap-3 text-sm text-slate-600">
                                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                                    <span>建议游玩: {duration}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                                <span>{item?.sub_title || '查看地图定位'}</span>
                            </div>
                        </div>

                        {/* 功能按钮 */}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button className="flex items-center justify-center gap-2 py-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 text-sm font-medium transition-colors">
                                <Share2 className="w-4 h-4" />
                                分享
                            </button>
                            <button className="flex items-center justify-center gap-2 py-2.5 bg-slate-50 hover:bg-red-50 hover:text-red-500 rounded-xl text-slate-600 text-sm font-medium transition-colors group">
                                <Heart className="w-4 h-4 group-hover:fill-current" />
                                收藏
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
