'use client';

import dynamic from 'next/dynamic';
import { useRef, useCallback } from 'react';
import ItineraryList from './ItineraryList';
import { MapContainerRef } from './MapContainer';

// 动态导入地图组件，禁用 SSR
const MapContainer = dynamic(() => import('./MapContainer'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-white/5">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-cyan-400 text-sm font-medium">地图加载中...</p>
            </div>
        </div>
    ),
});

interface Route {
    time_period?: string;
    name: string;
    desc: string;
    latitude: number;
    longitude: number;
    suggested_duration?: string;
    emoji?: string;
    tags?: string[];
    food_recommendation?: string;
    tips?: string;
    cost?: number;
}

interface DailyPlan {
    day: number;
    theme?: string;
    routes: Route[];
}

interface TripData {
    city: string;
    total_days?: number;
    trip_title?: string;
    trip_overview?: string;
    trip_vibe?: string;
    daily_plan: DailyPlan[];
}

interface TripResultsProps {
    tripData: TripData;
}

export default function TripResults({ tripData }: TripResultsProps) {
    const mapRef = useRef<MapContainerRef>(null);

    // 处理卡片悬停
    const handleSpotHover = useCallback((dayIndex: number, spotIndex: number) => {
        mapRef.current?.highlightSpot(dayIndex, spotIndex);
    }, []);

    // 处理卡片点击
    const handleSpotClick = useCallback((dayIndex: number, spotIndex: number) => {
        mapRef.current?.panToSpot(dayIndex, spotIndex);
    }, []);

    // 处理地图标记点击
    const handleMarkerClick = useCallback((dayIndex: number, spotIndex: number) => {
        // 可以添加滚动到对应卡片的逻辑
        console.log('Marker clicked:', dayIndex, spotIndex);
    }, []);

    const totalDays = tripData.total_days || tripData.daily_plan.length;

    return (
        <div className="flex flex-col md:flex-row h-full absolute inset-0 md:p-6 gap-4 md:gap-6 animate-fade-in-up delay-200">
            {/* 行程列表区域 - 移动端下部，桌面端左侧 */}
            <div className="order-2 md:order-1 h-[50%] md:h-full md:w-[420px] lg:w-[480px] shrink-0 flex flex-col">
                <div className="glass-card rounded-2xl md:rounded-3xl overflow-hidden flex flex-col h-full border border-white/10 shadow-2xl">
                    <ItineraryList
                        dailyPlan={tripData.daily_plan}
                        city={tripData.city}
                        tripTitle={tripData.trip_title}
                        tripVibe={tripData.trip_vibe || tripData.trip_overview}
                        totalDays={totalDays}
                        onSpotHover={handleSpotHover}
                        onSpotClick={handleSpotClick}
                    />
                </div>
            </div>

            {/* 地图区域 - 移动端上部，桌面端右侧 */}
            <div className="order-1 md:order-2 flex-1 relative h-[50%] md:h-full rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                <div className="absolute inset-0 z-0">
                    <MapContainer
                        ref={mapRef}
                        dailyPlan={tripData.daily_plan}
                        onMarkerClick={handleMarkerClick}
                    />
                </div>
                {/* 装饰性阴影 */}
                <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_40px_rgba(0,0,0,0.3)] rounded-2xl md:rounded-3xl" />
            </div>
        </div>
    );
}
