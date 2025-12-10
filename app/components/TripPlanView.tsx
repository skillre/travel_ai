'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ChevronLeft, ChevronRight, Coins, Lightbulb, Map, Calendar, Layers } from 'lucide-react';
import Image from 'next/image';
import { TripPlan, TripPlanItem } from '../types';
import TimelineView from './TimelineView';
import PlaceDetailDrawer from './PlaceDetailDrawer';

// 动态导入地图组件
const MapContainerNew = dynamic(() => import('./MapContainerNew'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-teal-600 text-sm font-medium">地图加载中...</p>
            </div>
        </div>
    ),
});

// MapContainerNew 暴露的方法接口
interface MapContainerNewRef {
    panToSpot: (dayIndex: number, itemIndex: number) => void;
    highlightSpot: (dayIndex: number, itemIndex: number) => void;
    clearHighlight: () => void;
    setActiveMarker: (dayIndex: number, itemIndex: number) => void;
    resize: () => void;
    showAllDays: () => void;
    showDay: (dayIndex: number) => void;
    showItemDetail: (dayIndex: number, itemIndex: number) => void;
}

interface TripPlanViewProps {
    tripPlan: TripPlan;
}

// 每天路线的颜色
const dayColors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#06b6d4', '#8b5cf6', '#ec4899',
];

export default function TripPlanView({ tripPlan }: TripPlanViewProps) {
    const mapRef = useRef<MapContainerNewRef>(null);
    const [mapMethods, setMapMethods] = useState<MapContainerNewRef | null>(null); // 使用 state 存储地图方法
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [selectedDay, setSelectedDay] = useState<number | null>(null); // null = 全部天
    const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
    const [bgLoading, setBgLoading] = useState(true);

    // 详情抽屉状态
    const [selectedDetailItem, setSelectedDetailItem] = useState<TripPlanItem | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // 地图组件就绪回调
    const handleMapReady = useCallback((methods: MapContainerNewRef) => {
        console.log('[TripPlanView] Map is ready, storing methods');
        setMapMethods(methods);
    }, []);

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

    useEffect(() => {
        fetchCityImage();
    }, [fetchCityImage]);

    // 处理卡片悬停
    const handleItemHover = useCallback((dayIndex: number, itemIndex: number) => {
        mapMethods?.highlightSpot(dayIndex, itemIndex);
    }, [mapMethods]);

    // 处理卡片点击 -在其右侧展示详情抽屉
    const handleItemClick = useCallback((dayIndex: number, itemIndex: number, item: TripPlanItem) => {
        console.log('[TripPlanView] handleItemClick called:', { dayIndex, itemIndex, item: item.title });

        // 设置选中的项目并打开抽屉
        setSelectedDetailItem(item);
        setIsDetailOpen(true);

        // 在地图上高亮并移动到该点
        if (mapMethods) {
            console.log('[TripPlanView] Calling setActiveMarker via mapMethods');
            mapMethods.setActiveMarker(dayIndex, itemIndex);
        } else {
            console.warn('[TripPlanView] mapMethods is null!');
        }
    }, [mapMethods]);

    // 处理地图 Marker 点击
    const handleMarkerClick = useCallback((dayIndex: number, itemIndex: number) => {
        const item = tripPlan.timeline[dayIndex]?.items[itemIndex];
        if (item) {
            setSelectedDetailItem(item);
            setIsDetailOpen(true);
            mapMethods?.setActiveMarker(dayIndex, itemIndex);
        }
    }, [tripPlan.timeline, mapMethods]);

    // 关闭详情抽屉
    const closeDetailDrawer = useCallback(() => {
        setIsDetailOpen(false);
        // 稍微延迟清除选中项，让动画更自然
        setTimeout(() => setSelectedDetailItem(null), 300);
    }, []);

    // 切换侧边栏
    const toggleSidebar = useCallback(() => {
        setIsSidebarOpen(prev => !prev);
        setTimeout(() => {
            mapMethods?.resize();
        }, 350);
    }, [mapMethods]);

    // 选择天数
    const handleSelectDay = useCallback((dayIndex: number | null) => {
        setSelectedDay(dayIndex);
        if (dayIndex !== null) {
            mapMethods?.showDay(dayIndex);
        } else {
            mapMethods?.showAllDays();
        }
    }, [mapMethods]);

    // 统计数据
    const totalSpots = tripPlan.timeline.reduce(
        (acc, day) => acc + day.items.filter(item => item.type === 'spot').length,
        0
    );
    const totalFood = tripPlan.timeline.reduce(
        (acc, day) => acc + day.items.filter(item => item.type === 'food').length,
        0
    );

    return (
        <div className="h-full w-full flex bg-slate-100 overflow-hidden">
            {/* 左侧面板 */}
            <div
                className={`
                    relative h-full flex flex-col bg-white border-r border-slate-200 shadow-xl z-20
                    transition-all duration-300 ease-in-out overflow-hidden
                    ${isSidebarOpen
                        ? 'w-full md:w-[480px] lg:w-[520px] translate-x-0'
                        : 'w-0 -translate-x-full'}
                `}
            >
                {/* Header */}
                <div className="shrink-0 relative overflow-hidden">
                    {/* 背景图 */}
                    <div className="relative h-40 md:h-48 w-full">
                        {backgroundImage ? (
                            <Image
                                src={backgroundImage}
                                alt={tripPlan.meta.city}
                                fill
                                priority
                                className="object-cover"
                                sizes="520px"
                            />
                        ) : (
                            <div className={`absolute inset-0 bg-gradient-to-br from-teal-400 to-sky-500 ${bgLoading ? 'animate-pulse' : ''}`} />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                        {/* 城市徽章 (左上角) - 上移位置，增强对比度 */}
                        <div className="absolute top-2 left-3 z-20">
                            <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-md border border-white/30 px-3 py-1 rounded-full shadow-lg">
                                <span className="text-base">📍</span>
                                <span className="text-sm font-bold text-white tracking-wide drop-shadow-md">
                                    {tripPlan.meta.city}
                                </span>
                            </div>
                        </div>

                        {/* 标题 */}
                        <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight drop-shadow-lg line-clamp-2 mb-2">
                                {tripPlan.meta.trip_title}
                            </h1>
                            <p className="text-sm text-white/90 italic font-medium drop-shadow-md border-l-2 border-teal-400 pl-3 line-clamp-2">
                                "{tripPlan.meta.trip_vibe}"
                            </p>
                        </div>
                    </div>

                    {/* 元数据条 */}
                    <div className="flex flex-col gap-2 p-3 bg-white border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-full border border-emerald-100">
                                <Coins className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-xs font-semibold text-emerald-700">¥{tripPlan.meta.total_estimated_cost}</span>
                            </div>
                        </div>
                        {/* 建议事项 - 完整显示 */}
                        <div className="flex items-start gap-1.5 px-2.5 py-2 bg-sky-50 rounded-lg border border-sky-100">
                            <Lightbulb className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
                            <span className="text-xs text-sky-700 leading-relaxed">{tripPlan.meta.suggestion}</span>
                        </div>
                    </div>

                    {/* 天数切换按钮组 */}
                    <div className="flex items-center gap-2 p-3 bg-slate-50 border-b border-slate-100 overflow-x-auto">
                        <button
                            onClick={() => handleSelectDay(null)}
                            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${selectedDay === null
                                ? 'bg-slate-800 text-white shadow-md'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                }`}
                        >
                            <Layers className="w-3.5 h-3.5" />
                            全部
                        </button>
                        {tripPlan.timeline.map((day, index) => (
                            <button
                                key={day.day}
                                onClick={() => handleSelectDay(index)}
                                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${selectedDay === index
                                    ? 'text-white shadow-md'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                    }`}
                                style={selectedDay === index ? { backgroundColor: dayColors[index % dayColors.length] } : {}}
                            >
                                <Calendar className="w-3.5 h-3.5" />
                                Day {day.day}
                            </button>
                        ))}
                    </div>

                    {/* 统计条 */}
                    <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-100">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <span className="font-semibold text-slate-700">{tripPlan.timeline.length}</span> 天 ·
                            <span className="font-semibold text-teal-600">{totalSpots}</span> 景点 ·
                            <span className="font-semibold text-orange-600">{totalFood}</span> 美食
                        </div>
                        {selectedDay !== null && (
                            <span className="text-xs text-slate-400">
                                当前: Day {tripPlan.timeline[selectedDay]?.day}
                            </span>
                        )}
                    </div>
                </div>

                {/* 内容区域 */}
                <div className="flex-1 overflow-y-auto">
                    <TimelineView
                        timeline={tripPlan.timeline}
                        city={tripPlan.meta.city}
                        selectedDay={selectedDay}
                        onItemHover={handleItemHover}
                        onItemClick={handleItemClick}
                    />
                </div>
            </div>

            {/* 折叠按钮 */}
            <button
                onClick={toggleSidebar}
                className={`
                    absolute z-30 top-1/2 -translate-y-1/2
                    w-6 h-16 bg-white shadow-lg rounded-r-xl
                    flex items-center justify-center
                    hover:bg-slate-50 hover:shadow-xl
                    transition-all duration-300 ease-in-out
                    border border-l-0 border-slate-200
                    ${isSidebarOpen
                        ? 'left-[400px] md:left-[480px] lg:left-[520px]'
                        : 'left-0'}
                `}
                aria-label={isSidebarOpen ? '收起侧边栏' : '展开侧边栏'}
            >
                {isSidebarOpen ? (
                    <ChevronLeft className="w-4 h-4 text-slate-500" />
                ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
            </button>

            {/* 地图区域 */}
            <div className="hidden md:block flex-1 h-full relative z-0 bg-slate-100 overflow-hidden">
                <MapContainerNew
                    ref={mapRef}
                    timeline={tripPlan.timeline}
                    selectedDay={selectedDay}
                    onMarkerClick={handleMarkerClick}
                    onReady={handleMapReady}
                />

                {/* 详情抽屉 (作为地图区域的浮层) */}
                <PlaceDetailDrawer
                    isOpen={isDetailOpen}
                    onClose={closeDetailDrawer}
                    item={selectedDetailItem}
                    city={tripPlan.meta.city}
                />
            </div>

            {/* 移动端地图按钮 */}
            {isSidebarOpen && (
                <button
                    onClick={toggleSidebar}
                    className="md:hidden fixed bottom-6 right-6 z-40 bg-teal-500 text-white px-4 py-3 rounded-full shadow-xl flex items-center gap-2 hover:bg-teal-600 transition-colors"
                >
                    <Map className="w-4 h-4" />
                    <span className="text-sm font-semibold">查看地图</span>
                </button>
            )}
        </div>
    );
}
