'use client';

import dynamic from 'next/dynamic';
import { useRef, useCallback, useState } from 'react';
import ItineraryList from './ItineraryList';
import { MapContainerRef } from './MapContainer';
import { TripData, isNewTripPlan, TripPlan, LegacyTripData } from '../types';
import UserAvatar from './UserAvatar';
import { useUser } from '../contexts/UserContext';
import UserProfileModal from './UserProfileModal';
import LoginModal from './LoginModal';

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

// 动态导入新版视图组件
const TripPlanView = dynamic(() => import('./TripPlanView'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-cyan-400 text-sm font-medium">加载中...</p>
            </div>
        </div>
    ),
});

interface TripResultsProps {
    tripData: TripData;
}

/**
 * 旅行结果展示组件
 * 支持新旧两种数据格式：
 * - 新格式 (TripPlan): 使用 TripPlanView 渲染
 * - 旧格式 (LegacyTripData): 使用现有的 ItineraryList + MapContainer
 */
export default function TripResults({ tripData }: TripResultsProps) {
    const { user, logout, updateAvatar, updateUserName, login } = useUser();
    const mapRef = useRef<MapContainerRef>(null);

    // 用户相关状态
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    const handleUserClick = useCallback(() => {
        if (user) {
            setIsProfileModalOpen(true);
        } else {
            setIsLoginModalOpen(true);
        }
    }, [user]);

    // 处理卡片悬停 (旧版)
    const handleSpotHover = useCallback((dayIndex: number, spotIndex: number) => {
        mapRef.current?.highlightSpot(dayIndex, spotIndex);
    }, []);

    // 处理卡片点击 (旧版)
    const handleSpotClick = useCallback((dayIndex: number, spotIndex: number) => {
        mapRef.current?.panToSpot(dayIndex, spotIndex);
    }, []);

    // 处理地图标记点击 (旧版)
    const handleMarkerClick = useCallback((dayIndex: number, spotIndex: number) => {
        console.log('Marker clicked:', dayIndex, spotIndex);
    }, []);

    // 检测数据格式并选择对应渲染方式
    if (isNewTripPlan(tripData)) {
        // 新格式：使用 TripPlanView
        return <TripPlanView tripPlan={tripData as TripPlan} />;
    }

    // 旧格式：使用现有组件
    const legacyData = tripData as LegacyTripData;
    const totalDays = legacyData.total_days || legacyData.daily_plan.length;

    return (
        <div className="flex flex-col md:flex-row h-full absolute inset-0 md:p-6 gap-4 md:gap-6 animate-fade-in-up delay-200">
            {/* 用户头像 - 右上角 */}
            <div className="absolute top-4 right-4 z-50 md:top-10 md:right-10">
                <UserAvatar
                    user={user || null}
                    onClick={handleUserClick}
                    size="md"
                />
            </div>
            {/* 行程列表区域 - 移动端下部，桌面端左侧 */}
            <div className="order-2 md:order-1 h-[50%] md:h-full md:w-[420px] lg:w-[480px] shrink-0 flex flex-col">
                <div className="glass-card rounded-2xl md:rounded-3xl overflow-hidden flex flex-col h-full border border-white/10 shadow-2xl">
                    <ItineraryList
                        dailyPlan={legacyData.daily_plan}
                        city={legacyData.city}
                        tripTitle={legacyData.trip_title}
                        tripVibe={legacyData.trip_vibe || legacyData.trip_overview}
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
                        dailyPlan={legacyData.daily_plan}
                        onMarkerClick={handleMarkerClick}
                        provider={legacyData.area && legacyData.area !== '中国大陆' ? 'mapbox' : 'amap'}
                    />
                </div>
                {/* 装饰性阴影 */}
                <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_40px_rgba(0,0,0,0.3)] rounded-2xl md:rounded-3xl" />
            </div>

            {/* 用户信息弹窗 */}
            {user && (
                <UserProfileModal
                    isOpen={isProfileModalOpen}
                    onClose={() => setIsProfileModalOpen(false)}
                    user={user}
                    onLogout={() => {
                        logout();
                        setIsProfileModalOpen(false);
                    }}
                    onUpdateAvatar={updateAvatar}
                    onUpdateUserName={updateUserName}
                />
            )}

            {/* 登录弹窗 */}
            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
                onLogin={login}
                wechatName="skillre"
                qrCodeUrl="/qrcode.png"
            />
        </div>
    );
}
