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
    isMobile?: boolean; // 移动端模式：底部滑入全屏 modal
}

export default function PlaceDetailDrawer({
    isOpen,
    onClose,
    item,
    city,
    isMobile = false,
}: PlaceDetailDrawerProps) {
    const isFood = item?.type === 'food';
    const [isVisible, setIsVisible] = useState(false);
    const [showMapSheet, setShowMapSheet] = useState(false);

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

    // 移动端：全屏底部滑入 modal
    if (isMobile) {
        return (
            <>
                {/* 背景遮罩 */}
                <div
                    className={`
                        fixed inset-0 bg-black/50 z-[999] transition-opacity duration-300
                        ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
                    `}
                    onClick={onClose}
                />
                {/* Modal 内容 */}
                <div
                    className={`
                        fixed inset-x-0 bottom-0 z-[1000] max-h-[90vh]
                        bg-white rounded-t-3xl shadow-2xl
                        transform transition-transform duration-300 ease-out
                        flex flex-col overflow-hidden
                        ${isOpen ? 'translate-y-0' : 'translate-y-full'}
                    `}
                >
                    {/* Handle 拖拽提示 */}
                    <div className="shrink-0 flex justify-center pt-3 pb-1" onClick={onClose}>
                        <div className="w-10 h-1 bg-slate-300 rounded-full" />
                    </div>

                    {/* 顶部图片区域 - 移动端更紧凑 */}
                    <div className="relative h-44 bg-slate-100 shrink-0 group">
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
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                        {/* 关闭按钮 */}
                        <button
                            onClick={onClose}
                            className="absolute top-3 right-3 p-2 bg-black/30 backdrop-blur-sm rounded-full text-white z-20"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* 标题 */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                            <div className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold mb-2 ${isFood ? 'bg-orange-500 text-white' : 'bg-teal-500 text-white'}`}>
                                {isFood ? '美食' : '景点'}
                            </div>
                            <h2 className="text-xl font-bold text-white leading-tight drop-shadow-md">
                                {item?.title}
                            </h2>
                            <div className="flex items-center gap-2 mt-1.5 text-sm">
                                <span className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded text-white text-xs">
                                    {item?.time_label}
                                </span>
                                {item?.cost ? (
                                    <span className="text-emerald-300 font-bold text-sm">¥{item.cost}</span>
                                ) : (
                                    <span className="text-white/80 text-xs">免费</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 内容滚动区域 */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[45vh]">
                        {/* 标签 */}
                        {item?.tags && item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {item.tags.map((tag, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* 描述 */}
                        <div>
                            <p className="text-slate-600 text-sm leading-relaxed">{item?.content.desc}</p>
                        </div>

                        {/* 亮点 */}
                        {item?.content.highlight_text && (
                            <div className={`p-3 rounded-xl text-sm ${isFood ? 'bg-orange-50 text-orange-800' : 'bg-sky-50 text-sky-800'}`}>
                                <span className="mr-1">{isFood ? '😋' : '💡'}</span>
                                {item.content.highlight_text}
                            </div>
                        )}

                        {/* 信息列表 */}
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                            {duration && (
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Clock className="w-4 h-4 text-slate-400" />
                                    <span>建议游玩: {duration}</span>
                                </div>
                            )}
                            {item?.address && (
                                <div
                                    onClick={() => setShowMapSheet(true)}
                                    className="flex items-start gap-2 text-sm text-slate-600 active:bg-slate-50 active:scale-[0.98] transition-all p-2 -mx-2 rounded-lg cursor-pointer"
                                >
                                    <MapPin className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                                    <span className="flex-1">
                                        {item.address}
                                        <span className="inline-block ml-2 text-xs text-teal-600 font-medium bg-teal-50 px-1.5 py-0.5 rounded">
                                            导航
                                        </span>
                                    </span>
                                    <div className="shrink-0 text-slate-300">
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 底部安全区域 */}
                    <div className="shrink-0 safe-area-bottom bg-white" />

                    {/* 地图选择 Action Sheet */}
                    {showMapSheet && (
                        <div className="fixed inset-0 z-[2000] flex flex-col justify-end">
                            {/* 背景 */}
                            <div
                                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                                onClick={() => setShowMapSheet(false)}
                            />

                            {/* 菜单 */}
                            <div className="relative bg-slate-100 rounded-t-2xl overflow-hidden animate-slide-up">
                                <div className="p-4 text-center text-slate-500 text-xs font-medium border-b border-slate-200/50 bg-white">
                                    导航到 {item?.title}
                                </div>
                                <div className="flex flex-col gap-[1px] bg-slate-200/50">
                                    <a
                                        href={`iosamap://navi?sourceApplication=webapp&lat=${item?.location?.lat}&lon=${item?.location?.lng}&name=${item?.title}&dev=0`}
                                        className="w-full py-4 bg-white text-slate-800 font-medium text-base text-center active:bg-slate-50"
                                        onClick={() => setTimeout(() => setShowMapSheet(false), 300)}
                                    >
                                        高德地图
                                    </a>
                                    <a
                                        href={`baidumap://map/marker?location=${item?.location?.lat},${item?.location?.lng}&title=${item?.title}&content=${item?.title}&src=webapp`}
                                        className="w-full py-4 bg-white text-slate-800 font-medium text-base text-center active:bg-slate-50"
                                        onClick={() => setTimeout(() => setShowMapSheet(false), 300)}
                                    >
                                        百度地图
                                    </a>
                                </div>
                                <div className="mt-2 text-center bg-white">
                                    <button
                                        className="w-full py-4 text-slate-500 font-medium text-base active:bg-slate-50"
                                        onClick={() => setShowMapSheet(false)}
                                    >
                                        取消
                                    </button>
                                </div>
                                {/* 底部安全区 */}
                                <div className="bg-white h-safe-bottom" />
                            </div>
                        </div>
                    )}
                </div>
            </>
        );
    }

    // 桌面端：右侧滑入抽屉
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
                <div className="relative h-56 bg-slate-100 shrink-0 group">
                    {imageUrl ? (
                        <Image
                            src={imageUrl}
                            alt={item?.title || ''}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                            priority
                        />
                    ) : (
                        <div className={`absolute inset-0 flex items-center justify-center text-4xl ${isFood ? 'bg-orange-50' : 'bg-teal-50'}`}>
                            {item?.emoji}
                        </div>
                    )}

                    {/* 渐变遮罩 */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />

                    {/* 关闭按钮 */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white/90 hover:text-white transition-all z-20"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* 顶部标签 - 显示景点/餐厅名称 */}
                    <div className={`
                        absolute top-4 left-4 px-3 py-1.5 rounded-full text-sm font-bold backdrop-blur-md z-20 border border-white/20 max-w-[200px] truncate
                        ${isFood
                            ? 'bg-orange-500/90 text-white shadow-lg'
                            : 'bg-teal-500/90 text-white shadow-lg'
                        }
                    `}>
                        {item?.title || (isFood ? '美食推荐' : '景点详情')}
                    </div>

                    {/* 标题内容 (覆盖在图片上) */}
                    <div className="absolute bottom-0 left-0 right-0 p-5 z-20">
                        <h2 className="text-2xl font-bold text-white leading-tight drop-shadow-md mb-2">
                            {item?.title}
                        </h2>
                        <div className="flex items-center flex-wrap gap-2 text-sm">
                            <span className="bg-white/20 backdrop-blur-sm px-2.5 py-0.5 rounded text-white border border-white/20 font-medium">
                                {item?.time_label}
                            </span>
                            {item?.cost ? (
                                <span className="text-emerald-300 font-bold drop-shadow-sm text-base">
                                    ¥{item.cost}<span className="text-xs font-normal text-white/80 ml-0.5">/人</span>
                                </span>
                            ) : (
                                <span className="text-white/90 backdrop-blur-sm px-2 py-0.5 rounded border border-white/10 bg-white/10">免费</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* 内容滚动区域 */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
                    <div className="p-5 space-y-6">
                        {/* 标签 - 稍微调整上边距 */}
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
                            {/* 详细地址 */}
                            {item?.address && (
                                <div className="flex items-start gap-3 text-sm text-slate-600">
                                    <MapPin className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                                    <span className="leading-relaxed">{item.address}</span>
                                </div>
                            )}

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
