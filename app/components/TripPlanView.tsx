'use client';

import { useRef, useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { ChevronLeft, ChevronRight, Coins, Lightbulb } from 'lucide-react';
import Image from 'next/image';
import { TripPlan, TripPlanItem } from '../types';
import TimelineView from './TimelineView';

// 动态导入地图组件，禁用 SSR
const MapContainerNew = dynamic(() => import('./MapContainerNew'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-white/50 backdrop-blur-sm rounded-2xl border border-white/20">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-3 border-tender-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-tender-blue-500 text-sm font-medium">地图加载中...</p>
            </div>
        </div>
    ),
});

interface MapContainerNewRef {
    panToSpot: (dayIndex: number, itemIndex: number) => void;
    highlightSpot: (dayIndex: number, itemIndex: number) => void;
    clearHighlight: () => void;
    setActiveMarker: (dayIndex: number, itemIndex: number) => void;
    resize: () => void;
}

interface TripPlanViewProps {
    tripPlan: TripPlan;
}

/**
 * 新版旅行计划主视图组件
 * 特性:
 * - 可折叠侧边栏
 * - 紧凑型顶部 Header
 * - 地图自动 resize
 */
export default function TripPlanView({ tripPlan }: TripPlanViewProps) {
    const mapRef = useRef<MapContainerNewRef>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
    const [bgLoading, setBgLoading] = useState(true);

    // 获取城市背景图
    const fetchCityImage = useCallback(async () => {
        try {
            const response = await fetch(
                `/api/image?query=${encodeURIComponent(tripPlan.meta.city + ' cityscape landmark')}`
            );
            const result = await response.json();
            if (result.success && result.imageUrl) {
                setBackgroundImage(result.imageUrl);
            }
        } catch (error) {
            console.error('Failed to fetch city image:', error);
        } finally {
            setBgLoading(false);
        }
    }, [tripPlan.meta.city]);

    // 初始化时获取背景图
    useState(() => {
        fetchCityImage();
    });

    // 处理卡片悬停 - 高亮对应 Marker
    const handleItemHover = useCallback((dayIndex: number, itemIndex: number) => {
        mapRef.current?.highlightSpot(dayIndex, itemIndex);
    }, []);

    // 处理卡片点击 - 地图 FlyTo 对应位置
    const handleItemClick = useCallback((dayIndex: number, itemIndex: number, item: TripPlanItem) => {
        mapRef.current?.setActiveMarker(dayIndex, itemIndex);
    }, []);

    // 处理地图 Marker 点击
    const handleMarkerClick = useCallback((dayIndex: number, itemIndex: number) => {
        console.log('Marker clicked:', dayIndex, itemIndex);
    }, []);

    // 切换侧边栏
    const toggleSidebar = useCallback(() => {
        setIsSidebarOpen(prev => !prev);
        // 延迟调用 resize 以等待动画完成
        setTimeout(() => {
            mapRef.current?.resize();
        }, 350);
    }, []);

    return (
        <div className="h-screen w-screen flex bg-slate-50 overflow-hidden">
            {/* Left Panel: Content (Collapsible) */}
            <div
                className={`
                    relative h-full flex flex-col bg-white border-r border-slate-200 shadow-2xl z-20
                    transition-all duration-300 ease-in-out overflow-hidden
                    ${isSidebarOpen
                        ? 'w-full md:w-[420px] lg:w-[460px] translate-x-0 opacity-100'
                        : 'w-0 -translate-x-full opacity-0'}
                `}
            >
                {/* === Compact Header (Module 4) === */}
                <div className="shrink-0 relative overflow-hidden">
                    {/* 背景图 - 紧凑高度 */}
                    <div className="relative h-36 md:h-40 w-full">
                        {backgroundImage ? (
                            <Image
                                src={backgroundImage}
                                alt={tripPlan.meta.city}
                                fill
                                priority
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, 460px"
                            />
                        ) : (
                            <div className={`absolute inset-0 bg-gradient-to-br from-teal-100 to-sky-100 ${bgLoading ? 'animate-pulse' : ''}`} />
                        )}
                        {/* 渐变遮罩 */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                        {/* 标题覆盖层 */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
                            <h1 className="text-xl md:text-2xl font-bold text-white leading-tight drop-shadow-lg line-clamp-2">
                                {tripPlan.meta.trip_title}
                            </h1>
                            <p className="mt-1 text-sm text-white/80 italic drop-shadow line-clamp-1">
                                "{tripPlan.meta.trip_vibe}"
                            </p>
                        </div>
                    </div>

                    {/* 元数据条 - Inline */}
                    <div className="flex items-center gap-2 p-3 bg-slate-50 border-b border-slate-100 overflow-x-auto">
                        {/* 费用 */}
                        <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full border border-slate-100 shadow-sm">
                            <Coins className="w-3.5 h-3.5 text-orange-500" />
                            <span className="text-xs font-semibold text-slate-700">¥{tripPlan.meta.total_estimated_cost}</span>
                        </div>

                        {/* 建议 */}
                        <div className="flex-1 min-w-0 flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 rounded-full border border-sky-100">
                            <Lightbulb className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                            <span className="text-xs text-sky-700 truncate">{tripPlan.meta.suggestion}</span>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content Container */}
                <div className="flex-1 overflow-y-auto">
                    <TimelineView
                        timeline={tripPlan.timeline}
                        city={tripPlan.meta.city}
                        onItemHover={handleItemHover}
                        onItemClick={handleItemClick}
                    />
                </div>
            </div>

            {/* === Toggle Button (Module 3) === */}
            <button
                onClick={toggleSidebar}
                className={`
                    absolute z-30 top-1/2 -translate-y-1/2
                    w-6 h-14 bg-white shadow-lg rounded-r-full
                    flex items-center justify-center
                    hover:bg-slate-50 hover:shadow-xl
                    transition-all duration-300 ease-in-out
                    border border-l-0 border-slate-200
                    ${isSidebarOpen
                        ? 'left-[420px] lg:left-[460px]'
                        : 'left-0'}
                `}
                aria-label={isSidebarOpen ? '收起侧边栏' : '展开侧边栏'}
            >
                {isSidebarOpen ? (
                    <ChevronLeft className="w-4 h-4 text-slate-600" />
                ) : (
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                )}
            </button>

            {/* Right Panel: Map (Fixed) */}
            <div className="hidden md:block flex-1 h-full relative z-0 bg-slate-100">
                <MapContainerNew
                    ref={mapRef}
                    timeline={tripPlan.timeline}
                    onMarkerClick={handleMarkerClick}
                />
            </div>

            {/* Mobile: Map Toggle Button (shown when sidebar open) */}
            {isSidebarOpen && (
                <button
                    onClick={toggleSidebar}
                    className="md:hidden fixed bottom-6 right-6 z-40 bg-teal-500 text-white px-4 py-3 rounded-full shadow-xl flex items-center gap-2 hover:bg-teal-600 transition-colors"
                >
                    <span className="text-sm font-semibold">查看地图</span>
                    <ChevronRight className="w-4 h-4" />
                </button>
            )}
        </div>
    );
}
