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
        <div className="h-screen w-screen flex bg-slate-50 overflow-hidden">
            {/* Left Panel: Content (Scrollable) */}
            <div className="w-full md:w-[480px] lg:w-[500px] shrink-0 h-full flex flex-col bg-white border-r border-slate-200 shadow-2xl z-20 overflow-y-auto">
                {/* Scrollable Content Container */}
                <div className="flex flex-col min-h-min pb-20">
                    {/* Header Section */}
                    <ResultHeroSection meta={tripPlan.meta} />

                    {/* Timeline Container */}
                    <div className="flex-1">
                        <TimelineView
                            timeline={tripPlan.timeline}
                            city={tripPlan.meta.city}
                            onItemHover={handleItemHover}
                            onItemClick={handleItemClick}
                        />
                    </div>
                </div>
            </div>

            {/* Right Panel: Map (Fixed) */}
            <div className="hidden md:block flex-1 h-full relative z-0 bg-slate-100">
                <MapContainerNew
                    ref={mapRef}
                    timeline={tripPlan.timeline}
                    onMarkerClick={handleMarkerClick}
                />
            </div>
        </div>
    );
}
