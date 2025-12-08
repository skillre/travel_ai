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

            if (!map || !AMap || !timeline || timeline.length === 0) return;

            map.clearMap();
            markersRef.current = [];

            const allMarkers: any[] = [];

            timeline.forEach((day, dayIndex) => {
                const color = dayColors[dayIndex % dayColors.length];
                const pathPoints: any[] = [];
                const dayMarkers: any[] = [];

                day.items.forEach((item, itemIndex) => {
                    const lnglat = new AMap.LngLat(item.location.lng, item.location.lat);
                    pathPoints.push(lnglat);

                    const isFood = item.type === 'food';

                    // 创建差异化标记
                    const markerContent = `
                        <div class="custom-marker ${isFood ? 'food' : 'spot'}" style="
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            width: 36px;
                            height: 36px;
                            border-radius: 50%;
                            background: ${isFood ? 'linear-gradient(135deg, #f97316, #ea580c)' : `linear-gradient(135deg, ${color}, ${color}dd)`};
                            box-shadow: 0 4px 15px ${isFood ? 'rgba(249, 115, 22, 0.5)' : `${color}60`};
                            border: 3px solid rgba(255,255,255,0.9);
                            font-size: 18px;
                            cursor: pointer;
                            transition: transform 0.3s ease;
                        ">
                            ${item.emoji || (isFood ? '🍽️' : '📍')}
                        </div>
                    `;

                    const marker = new AMap.Marker({
                        position: lnglat,
                        content: markerContent,
                        offset: new AMap.Pixel(-18, -18),
                    });

                    // 标签 (名称)
                    const labelContent = `
                        <div style="
                            background: ${isFood ? 'linear-gradient(135deg, #f97316, #ea580c)' : `linear-gradient(135deg, ${color}, ${color}dd)`};
                            color: white;
                            padding: 6px 12px;
                            border-radius: 20px;
                            font-size: 12px;
                            font-weight: bold;
                            white-space: nowrap;
                            box-shadow: 0 4px 15px ${isFood ? 'rgba(249, 115, 22, 0.5)' : `${color}60`};
                            border: 2px solid rgba(255,255,255,0.3);
                        ">${item.emoji || ''} ${item.title}</div>
                    `;

                    marker.setLabel({
                        content: labelContent,
                        direction: 'top',
                        offset: new AMap.Pixel(0, -8),
                    });

                    // 信息窗口内容
                    const infoContent = `
                        <div style="padding: 16px; min-width: 260px; max-width: 340px; font-family: system-ui;">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                                <span style="font-size: 32px;">${item.emoji || (isFood ? '🍽️' : '📍')}</span>
                                <div>
                                    <h3 style="margin: 0; color: ${isFood ? '#f97316' : color}; font-size: 18px; font-weight: bold;">
                                        ${item.title}
                                    </h3>
                                    <span style="font-size: 12px; color: #888;">Day ${day.day} · ${item.time_label}</span>
                                </div>
                            </div>
                            <p style="margin: 0 0 12px 0; color: #555; font-size: 14px; line-height: 1.6;">
                                ${item.content.desc}
                            </p>
                            ${item.content.highlight_text ? `
                                <div style="display: flex; align-items: flex-start; gap: 8px; padding: 10px; background: ${isFood ? '#fff7ed' : '#fffbeb'}; border-radius: 10px; margin-bottom: 10px;">
                                    <span>${isFood ? '🍽️' : '⚠️'}</span>
                                    <div style="font-size: 13px;">
                                        <strong style="color: ${isFood ? '#ea580c' : '#d97706'};">${item.content.highlight_label}:</strong>
                                        <span style="color: #666;"> ${item.content.highlight_text}</span>
                                    </div>
                                </div>
                            ` : ''}
                            ${item.cost > 0 ? `
                                <div style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; background: ${isFood ? '#fff7ed' : '#f0fdf4'}; border-radius: 20px;">
                                    <span>💰</span>
                                    <span style="font-size: 14px; color: ${isFood ? '#ea580c' : '#16a34a'}; font-weight: bold;">¥${item.cost}</span>
                                </div>
                            ` : ''}
                        </div>
                    `;

                    marker.on('click', () => {
                        const infoWindow = new AMap.InfoWindow({
                            content: infoContent,
                            offset: new AMap.Pixel(0, -40),
                        });
                        infoWindow.open(map, lnglat);
                        onMarkerClick?.(dayIndex, itemIndex);
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
                        strokeWeight: 5,
                        strokeOpacity: 0.8,
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
        }, [timeline, onMarkerClick]);

        useEffect(() => {
            if (mapReady && timeline && timeline.length > 0) {
                drawMarkersAndRoutes();
            }
        }, [mapReady, timeline, drawMarkersAndRoutes]);

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
                {timeline && timeline.length > 0 && !isLoading && !error && (
                    <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-md rounded-xl p-3 shadow-xl border border-white/10 z-10">
                        <p className="text-xs text-slate-400 mb-2 font-medium">图例</p>
                        <div className="flex flex-wrap gap-3">
                            <div className="flex items-center gap-1.5">
                                <div className="w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center text-[10px]">📍</div>
                                <span className="text-xs text-slate-300">景点</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center text-[10px]">🍽️</div>
                                <span className="text-xs text-slate-300">美食</span>
                            </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-white/10 flex flex-wrap gap-2">
                            {timeline.map((day, index) => (
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
    }
);

MapContainerNew.displayName = 'MapContainerNew';

export default MapContainerNew;
