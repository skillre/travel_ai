'use client';

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';

interface Route {
    name: string;
    desc: string;
    latitude: number;
    longitude: number;
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

export interface MapContainerRef {
    panToSpot: (dayIndex: number, spotIndex: number) => void;
    highlightSpot: (dayIndex: number, spotIndex: number) => void;
    clearHighlight: () => void;
}

interface MapContainerProps {
    dailyPlan: DailyPlan[];
    onMarkerClick?: (dayIndex: number, spotIndex: number) => void;
}

// 每天路线的颜色
const dayColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8'
];

const MapContainer = forwardRef<MapContainerRef, MapContainerProps>(({ dailyPlan, onMarkerClick }, ref) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const AMapRef = useRef<any>(null);
    const markersRef = useRef<any[][]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mapReady, setMapReady] = useState(false);
    const [highlightedSpot, setHighlightedSpot] = useState<{ day: number; spot: number } | null>(null);

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
        panToSpot: (dayIndex: number, spotIndex: number) => {
            const map = mapInstance.current;
            if (!map || !markersRef.current[dayIndex]?.[spotIndex]) return;

            const marker = markersRef.current[dayIndex][spotIndex];
            const position = marker.getPosition();
            map.setCenter(position);
            map.setZoom(15);
        },
        highlightSpot: (dayIndex: number, spotIndex: number) => {
            setHighlightedSpot({ day: dayIndex, spot: spotIndex });
            // 让标记跳动
            const marker = markersRef.current[dayIndex]?.[spotIndex];
            if (marker) {
                marker.setAnimation('AMAP_ANIMATION_BOUNCE');
                setTimeout(() => {
                    marker.setAnimation('AMAP_ANIMATION_NONE');
                }, 1500);
            }
        },
        clearHighlight: () => {
            setHighlightedSpot(null);
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
                    mapStyle: 'amap://styles/darkblue',
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

        if (!map || !AMap || !dailyPlan || dailyPlan.length === 0) return;

        map.clearMap();
        markersRef.current = [];

        const allMarkers: any[] = [];

        dailyPlan.forEach((day, dayIndex) => {
            const color = dayColors[dayIndex % dayColors.length];
            const pathPoints: any[] = [];
            const dayMarkers: any[] = [];

            day.routes.forEach((route, routeIndex) => {
                const lnglat = new AMap.LngLat(route.longitude, route.latitude);
                pathPoints.push(lnglat);

                // 创建更美观的标记
                const marker = new AMap.Marker({
                    position: lnglat,
                    title: route.name,
                    label: {
                        content: `<div style="
                            background: linear-gradient(135deg, ${color}, ${color}dd);
                            color: white;
                            padding: 6px 12px;
                            border-radius: 20px;
                            font-size: 13px;
                            font-weight: bold;
                            white-space: nowrap;
                            box-shadow: 0 4px 15px ${color}60;
                            border: 2px solid rgba(255,255,255,0.3);
                            backdrop-filter: blur(4px);
                        ">${route.emoji || ''} ${route.name}</div>`,
                        direction: 'top',
                        offset: new AMap.Pixel(0, -8),
                    },
                });

                const infoContent = `
                    <div style="padding: 16px; min-width: 240px; max-width: 320px; font-family: system-ui;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                            <span style="font-size: 28px;">${route.emoji || '📍'}</span>
                            <div>
                                <h3 style="margin: 0; color: ${color}; font-size: 18px; font-weight: bold;">
                                    ${route.name}
                                </h3>
                                <span style="font-size: 12px; color: #888;">Day ${day.day} · 第${routeIndex + 1}站</span>
                            </div>
                        </div>
                        <p style="margin: 0 0 12px 0; color: #555; font-size: 14px; line-height: 1.6;">
                            ${route.desc}
                        </p>
                        ${route.food_recommendation ? `
                            <div style="display: flex; align-items: flex-start; gap: 8px; padding: 8px; background: #fff5f5; border-radius: 8px; margin-bottom: 8px;">
                                <span>🍽️</span>
                                <span style="font-size: 13px; color: #666;">${route.food_recommendation}</span>
                            </div>
                        ` : ''}
                        ${route.cost ? `
                            <div style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; background: #f0fdf4; border-radius: 20px;">
                                <span>💰</span>
                                <span style="font-size: 13px; color: #16a34a; font-weight: bold;">¥${route.cost}</span>
                            </div>
                        ` : ''}
                    </div>
                `;

                marker.on('click', () => {
                    const infoWindow = new AMap.InfoWindow({
                        content: infoContent,
                        offset: new AMap.Pixel(0, -35),
                    });
                    infoWindow.open(map, lnglat);
                    onMarkerClick?.(dayIndex, routeIndex);
                });

                map.add(marker);
                allMarkers.push(marker);
                dayMarkers.push(marker);
            });

            markersRef.current.push(dayMarkers);

            // 绘制路线
            if (pathPoints.length > 1) {
                const polyline = new AMap.Polyline({
                    path: pathPoints,
                    strokeColor: color,
                    strokeWeight: 6,
                    strokeOpacity: 0.85,
                    strokeStyle: 'solid',
                    lineJoin: 'round',
                    lineCap: 'round',
                    showDir: true,
                });
                map.add(polyline);
            }
        });

        if (allMarkers.length > 0) {
            map.setFitView(allMarkers, false, [80, 80, 80, 80]);
        }
    }, [dailyPlan, onMarkerClick]);

    useEffect(() => {
        if (mapReady && dailyPlan && dailyPlan.length > 0) {
            drawMarkersAndRoutes();
        }
    }, [mapReady, dailyPlan, drawMarkersAndRoutes]);

    return (
        <div className="relative w-full h-full">
            <div ref={mapRef} className="w-full h-full" style={{ minHeight: '300px' }} />

            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-cyan-400 font-medium">地图加载中...</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90">
                    <div className="text-center p-8">
                        <p className="text-red-400 text-lg mb-2">😔 {error}</p>
                        <p className="text-slate-500 text-sm">请检查高德地图 API Key 配置</p>
                    </div>
                </div>
            )}

            {/* 图例 */}
            {dailyPlan && dailyPlan.length > 0 && !isLoading && !error && (
                <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-md rounded-xl p-3 shadow-xl border border-white/10 z-10">
                    <p className="text-xs text-slate-400 mb-2 font-medium">路线图例</p>
                    <div className="flex flex-wrap gap-2">
                        {dailyPlan.map((day, index) => (
                            <div key={day.day} className="flex items-center gap-1.5">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: dayColors[index % dayColors.length] }}
                                />
                                <span className="text-xs text-slate-300">Day {day.day}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
});

MapContainer.displayName = 'MapContainer';

export default MapContainer;
