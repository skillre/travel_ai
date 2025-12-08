'use client';

import { useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { TripPlan, TripPlanItem } from '../types';
import ResultHeroSection from './ResultHeroSection';
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
}

interface TripPlanViewProps {
    tripPlan: TripPlan;
}

/**
 * 新版旅行计划主视图组件
 * 布局：
 * ┌─────────────────────────────────────────┐
 * │           ResultHeroSection             │
 * ├────────────────────┬────────────────────┤
 * │   TimelineView     │   MapContainer     │
 * └────────────────────┴────────────────────┘
 */
export default function TripPlanView({ tripPlan }: TripPlanViewProps) {
    const mapRef = useRef<MapContainerNewRef>(null);

    // 处理卡片悬停 - 高亮对应 Marker
    const handleItemHover = useCallback((dayIndex: number, itemIndex: number) => {
        mapRef.current?.highlightSpot(dayIndex, itemIndex);
    }, []);

    // 处理卡片点击 - 地图 FlyTo 对应位置
    const handleItemClick = useCallback((dayIndex: number, itemIndex: number, item: TripPlanItem) => {
        mapRef.current?.panToSpot(dayIndex, itemIndex);
    }, []);

    // 处理地图 Marker 点击
    const handleMarkerClick = useCallback((dayIndex: number, itemIndex: number) => {
        // 可以添加滚动到对应卡片的逻辑
        console.log('Marker clicked:', dayIndex, itemIndex);
    }, []);

    return (
        <div className="flex flex-col h-full animate-fade-in-up">
            {/* 顶部 Hero 区域 */}
            <div className="shrink-0 px-4 md:px-6 pt-4 md:pt-6">
                <ResultHeroSection meta={tripPlan.meta} />
            </div>

            {/* 主内容区域：时光轴 + 地图 */}
            <div className="flex-1 flex flex-col md:flex-row p-4 md:p-6 gap-4 md:gap-6 min-h-0">
                {/* 时光轴列表区域 */}
                <div className="order-2 md:order-1 h-[50%] md:h-full md:w-[420px] lg:w-[480px] shrink-0">
                    <div className="bg-white/40 backdrop-blur-xl rounded-2xl md:rounded-3xl overflow-hidden h-full border border-white/60 shadow-glass">
                        <TimelineView
                            timeline={tripPlan.timeline}
                            city={tripPlan.meta.city}
                            onItemHover={handleItemHover}
                            onItemClick={handleItemClick}
                        />
                    </div>
                </div>

                {/* 地图区域 */}
                <div className="order-1 md:order-2 flex-1 relative h-[50%] md:h-full rounded-2xl md:rounded-3xl overflow-hidden shadow-soft border border-white/60 bg-white/50">
                    <div className="absolute inset-0 z-0">
                        <MapContainerNew
                            ref={mapRef}
                            timeline={tripPlan.timeline}
                            onMarkerClick={handleMarkerClick}
                        />
                    </div>
                    {/* 装饰性阴影 - 更轻柔 */}
                    <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_20px_rgba(0,0,0,0.05)] rounded-2xl md:rounded-3xl" />
                </div>
            </div>
        </div>
    );
}
