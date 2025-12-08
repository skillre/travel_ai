'use client';

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { TripPlanDay } from '../types';

export interface MapContainerNewRef {
    panToSpot: (dayIndex: number, itemIndex: number) => void;
    highlightSpot: (dayIndex: number, itemIndex: number) => void;
    clearHighlight: () => void;
}

interface MapContainerNewProps {
    timeline: TripPlanDay[];
    onMarkerClick?: (dayIndex: number, itemIndex: number) => void;
}

// 每天路线的颜色
const dayColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8'
];

/**
 * 新版地图组件 - 支持新数据格式
 * 差异化 Marker：景点蓝色📍 / 餐饮橙色🍽️
 */
const MapContainerNew = forwardRef<MapContainerNewRef, MapContainerNewProps>(
    ({ timeline, onMarkerClick }, ref) => {
        const mapRef = useRef<HTMLDivElement>(null);
        const mapInstance = useRef<any>(null);
        const AMapRef = useRef<any>(null);
        const markersRef = useRef<any[][]>([]);
        const [isLoading, setIsLoading] = useState(true);
        const [error, setError] = useState<string | null>(null);
        const [mapReady, setMapReady] = useState(false);

        // 暴露方法给父组件
        useImperativeHandle(ref, () => ({
            panToSpot: (dayIndex: number, itemIndex: number) => {
                const map = mapInstance.current;
                if (!map || !markersRef.current[dayIndex]?.[itemIndex]) return;

                const marker = markersRef.current[dayIndex][itemIndex];
                const position = marker.getPosition();
                map.setCenter(position);
                map.setZoom(16);
            },
            highlightSpot: (dayIndex: number, itemIndex: number) => {
                const marker = markersRef.current[dayIndex]?.[itemIndex];
                if (marker) {
                    marker.setAnimation('AMAP_ANIMATION_BOUNCE');
                    setTimeout(() => {
                        marker.setAnimation('AMAP_ANIMATION_NONE');
                    }, 1500);
                }
            },
            clearHighlight: () => {
                // 清除所有高亮
            },
        }));

        // 初始化地图
        useEffect(() => {
            let isMounted = true;

            const initMap = async () => {
                try {
                    const AMapLoader = (await import('@amap/amap-jsapi-loader')).default;

                    const amapKey = process.env.NEXT_PUBLIC_AMAP_KEY;
                    if (!amapKey) {
                        throw new Error('缺少高德地图 API Key');
                    }

                    const AMap = await AMapLoader.load({
                        key: amapKey,
                        version: '1.4.15',
                        plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.InfoWindow'],
                    });

                    if (!isMounted || !mapRef.current) return;

                    AMapRef.current = AMap;

                    const map = new AMap.Map(mapRef.current, {
                        zoom: 12,
                        center: [118.089, 24.479],
                        resizeEnable: true,
                        mapStyle: 'amap://styles/normal', // Light Style
                    });

                    mapInstance.current = map;

                    map.on('complete', () => {
                        if (isMounted) {
                            setIsLoading(false);
                            setMapReady(true);
                        }
                    });

                    map.addControl(new AMap.Scale());
                    map.addControl(new AMap.ToolBar({
                        position: 'RB',
                        liteStyle: true,
                    }));

                } catch (err) {
                    console.error('Map init error:', err);
                    if (isMounted) {
                        setError(err instanceof Error ? err.message : '地图加载失败');
                        setIsLoading(false);
                    }
                }
            };

            initMap();

            return () => {
                isMounted = false;
                if (mapInstance.current) {
                    mapInstance.current.destroy();
                    mapInstance.current = null;
                }
            };
        }, []);

        // 绘制标记和路线
        const drawMarkersAndRoutes = useCallback(() => {
            const map = mapInstance.current;
            const AMap = AMapRef.current;

            if (!map || !AMap || !timeline || timeline.length === 0) return;

            map.clearMap();
            markersRef.current = [];

            const allMarkers: any[] = [];

            timeline.forEach((day, dayIndex) => {
                // Use new gentle colors for lines
                const color = dayColors[dayIndex % dayColors.length];
                const pathPoints: any[] = [];
                const dayMarkers: any[] = [];

                day.items.forEach((item, itemIndex) => {
                    const lnglat = new AMap.LngLat(item.location.lng, item.location.lat);
                    pathPoints.push(lnglat);

                    const isFood = item.type === 'food';

                    // Clean Markers
                    const markerContent = `
                        <div class="custom-marker" style="
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            width: 40px;
                            height: 40px;
                            border-radius: 50%;
                            background: white;
                            box-shadow: 0 4px 15px rgba(0,0,0,0.15);
                            border: 3px solid ${isFood ? '#f97316' : '#2dd4bf'};
                            font-size: 20px;
                            cursor: pointer;
                            transition: transform 0.3s ease;
                        ">
                            ${item.emoji || (isFood ? '🍽️' : '📍')}
                        </div>
                    `;

                    const marker = new AMap.Marker({
                        position: lnglat,
                        content: markerContent,
                        offset: new AMap.Pixel(-20, -20),
                        zIndex: 100 + itemIndex,
                    });

                    // 标签 (Bubble Style)
                    const labelContent = `
                        <div style="
                            background: white;
                            color: #334155;
                            padding: 8px 12px;
                            border-radius: 8px;
                            font-size: 13px;
                            font-weight: 600;
                            white-space: nowrap;
                            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                            border: 1px solid #f1f5f9;
                        ">${item.title}</div>
                    `;

                    marker.setLabel({
                        content: labelContent,
                        direction: 'top',
                        offset: new AMap.Pixel(0, -10),
                    });

                    // Info Window (Modern Clean)
                    const infoContent = `
                        <div style="padding: 16px; min-width: 260px; font-family: system-ui;">
                            <h3 style="margin: 0 0 4px 0; color: #1e293b; font-size: 16px; font-weight: bold;">
                                ${item.title}
                            </h3>
                            <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">Day ${day.day} · ${item.time_label}</div>
                            <p style="margin: 0; color: #475569; font-size: 13px; line-height: 1.5;">
                                ${item.content.desc.substring(0, 60)}...
                            </p>
                        </div>
                    `;

                    marker.on('click', () => {
                        const infoWindow = new AMap.InfoWindow({
                            content: infoContent,
                            offset: new AMap.Pixel(0, -45),
                        });
                        infoWindow.open(map, lnglat);
                        onMarkerClick?.(dayIndex, itemIndex);
                    });

                    map.add(marker);
                    allMarkers.push(marker);
                    dayMarkers.push(marker);
                });

                markersRef.current.push(dayMarkers);

                // 绘制路线 - Gentle Teal Lines
                if (pathPoints.length > 1) {
                    const polyline = new AMap.Polyline({
                        path: pathPoints,
                        strokeColor: '#2dd4bf', // Teal-400
                        strokeWeight: 6,
                        strokeOpacity: 0.8,
                        strokeStyle: 'solid',
                        lineJoin: 'round',
                        lineCap: 'round',
                        showDir: true,
                        zIndex: 50,
                    });
                    map.add(polyline);
                }
            });

            if (allMarkers.length > 0) {
                map.setFitView(allMarkers, false, [80, 80, 80, 80]);
            }
        }, [timeline, onMarkerClick]);

        useEffect(() => {
            if (mapReady && timeline && timeline.length > 0) {
                drawMarkersAndRoutes();
            }
        }, [mapReady, timeline, drawMarkersAndRoutes]);

        return (
            <div className="relative w-full h-full bg-slate-50">
                <div ref={mapRef} className="w-full h-full" style={{ minHeight: '300px', background: '#f8fafc' }} />

                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-teal-600 font-medium text-sm">Loading Map...</p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-50">
                        <div className="text-center p-8">
                            <p className="text-red-500 text-sm mb-2">😔 {error}</p>
                        </div>
                    </div>
                )}

                {/* Floating Legend - Light Glass */}
                {timeline && timeline.length > 0 && !isLoading && !error && (
                    <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-md rounded-xl p-4 shadow-xl border border-slate-100 z-10 transition-all hover:scale-105 cursor-default">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-teal-400"></div>
                                <span className="text-xs text-slate-600 font-bold">Spot</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                                <span className="text-xs text-slate-600 font-bold">Food</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }
);

MapContainerNew.displayName = 'MapContainerNew';

export default MapContainerNew;
