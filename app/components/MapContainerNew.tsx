'use client';

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { TripPlanDay } from '../types';

export interface MapContainerNewRef {
    panToSpot: (dayIndex: number, itemIndex: number) => void;
    highlightSpot: (dayIndex: number, itemIndex: number) => void;
    clearHighlight: () => void;
    setActiveMarker: (dayIndex: number, itemIndex: number) => void;
    resize: () => void;
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
 * 新版地图组件 - 优化 Marker 显示
 * - 默认只显示小圆点，降低视觉噪音
 * - Hover/Click 显示 InfoWindow
 * - 支持缩放级别控制标签显示
 * - 支持 Active 状态高亮
 */
const MapContainerNew = forwardRef<MapContainerNewRef, MapContainerNewProps>(
    ({ timeline, onMarkerClick }, ref) => {
        const mapRef = useRef<HTMLDivElement>(null);
        const mapInstance = useRef<any>(null);
        const AMapRef = useRef<any>(null);
        const markersRef = useRef<any[][]>([]);
        const labelsRef = useRef<any[][]>([]); // 存储标签引用
        const hoverInfoWindowRef = useRef<any>(null);
        const [isLoading, setIsLoading] = useState(true);
        const [error, setError] = useState<string | null>(null);
        const [mapReady, setMapReady] = useState(false);
        const [activeMarker, setActiveMarkerState] = useState<{ day: number; item: number } | null>(null);
        const [currentZoom, setCurrentZoom] = useState(12);

        // 更新标签可见性（基于缩放级别）
        const updateLabelVisibility = useCallback((zoom: number) => {
            const showLabels = zoom > 16;
            labelsRef.current.forEach(dayLabels => {
                dayLabels.forEach(label => {
                    if (label) {
                        label.setStyle({ opacity: showLabels ? 1 : 0 });
                    }
                });
            });
        }, []);

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
                setActiveMarkerState(null);
            },
            setActiveMarker: (dayIndex: number, itemIndex: number) => {
                setActiveMarkerState({ day: dayIndex, item: itemIndex });
                // Pan to marker
                const map = mapInstance.current;
                if (!map || !markersRef.current[dayIndex]?.[itemIndex]) return;
                const marker = markersRef.current[dayIndex][itemIndex];
                const position = marker.getPosition();
                map.setCenter(position);
                map.setZoom(16);

                // Bounce animation
                marker.setAnimation('AMAP_ANIMATION_BOUNCE');
                setTimeout(() => {
                    marker.setAnimation('AMAP_ANIMATION_NONE');
                }, 1500);
            },
            resize: () => {
                if (mapInstance.current) {
                    setTimeout(() => {
                        mapInstance.current.resize();
                    }, 50);
                }
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
                        plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.InfoWindow', 'AMap.Text'],
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

                    // 监听缩放变化
                    map.on('zoomchange', () => {
                        const zoom = map.getZoom();
                        setCurrentZoom(zoom);
                        updateLabelVisibility(zoom);
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
        }, [updateLabelVisibility]);

        // 绘制标记和路线
        const drawMarkersAndRoutes = useCallback(() => {
            const map = mapInstance.current;
            const AMap = AMapRef.current;

            if (!map || !AMap || !timeline || timeline.length === 0) return;

            map.clearMap();
            markersRef.current = [];
            labelsRef.current = [];

            const allMarkers: any[] = [];

            timeline.forEach((day, dayIndex) => {
                const color = dayColors[dayIndex % dayColors.length];
                const pathPoints: any[] = [];
                const dayMarkers: any[] = [];
                const dayLabels: any[] = [];

                day.items.forEach((item, itemIndex) => {
                    const lnglat = new AMap.LngLat(item.location.lng, item.location.lat);
                    pathPoints.push(lnglat);

                    const isFood = item.type === 'food';
                    const markerColor = isFood ? '#f97316' : '#2dd4bf';

                    // === 优化后的 Marker：只显示小圆点 ===
                    const isActive = activeMarker?.day === dayIndex && activeMarker?.item === itemIndex;
                    const dotSize = isActive ? 20 : 14;
                    const borderWidth = isActive ? 3 : 2;

                    const dotContent = `
                        <div class="map-dot-marker" style="
                            width: ${dotSize}px;
                            height: ${dotSize}px;
                            border-radius: 50%;
                            background: ${markerColor};
                            border: ${borderWidth}px solid white;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.25);
                            cursor: pointer;
                            transition: all 0.2s ease;
                        "></div>
                    `;

                    const marker = new AMap.Marker({
                        position: lnglat,
                        content: dotContent,
                        offset: new AMap.Pixel(-dotSize / 2, -dotSize / 2),
                        zIndex: isActive ? 200 : 100 + itemIndex,
                    });

                    // === Hover 显示简洁气泡 ===
                    marker.on('mouseenter', () => {
                        // 关闭之前的 hover info window
                        if (hoverInfoWindowRef.current) {
                            hoverInfoWindowRef.current.close();
                        }

                        const hoverContent = `
                            <div style="
                                padding: 10px 14px;
                                background: white;
                                border-radius: 10px;
                                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                                font-family: system-ui, sans-serif;
                                min-width: 120px;
                                max-width: 200px;
                            ">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="font-size: 20px;">${item.emoji || (isFood ? '🍽️' : '📍')}</span>
                                    <div>
                                        <div style="font-size: 14px; font-weight: 600; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;">
                                            ${item.title}
                                        </div>
                                        <div style="font-size: 11px; color: #64748b;">
                                            Day ${day.day} · ${item.time_label}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;

                        hoverInfoWindowRef.current = new AMap.InfoWindow({
                            content: hoverContent,
                            offset: new AMap.Pixel(0, -12),
                            closeWhenClickMap: true,
                            isCustom: true,
                        });
                        hoverInfoWindowRef.current.open(map, lnglat);
                    });

                    marker.on('mouseleave', () => {
                        if (hoverInfoWindowRef.current) {
                            hoverInfoWindowRef.current.close();
                            hoverInfoWindowRef.current = null;
                        }
                    });

                    // === Click 显示详细 InfoWindow ===
                    const detailContent = `
                        <div style="
                            padding: 16px;
                            min-width: 260px;
                            max-width: 320px;
                            font-family: system-ui, sans-serif;
                            background: white;
                            border-radius: 12px;
                        ">
                            <div style="display: flex; align-items: flex-start; gap: 10px; margin-bottom: 12px;">
                                <div style="
                                    width: 44px;
                                    height: 44px;
                                    border-radius: 10px;
                                    background: ${isFood ? '#fff7ed' : '#f0fdfa'};
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    font-size: 24px;
                                    flex-shrink: 0;
                                ">
                                    ${item.emoji || (isFood ? '🍽️' : '📍')}
                                </div>
                                <div style="flex: 1; min-width: 0;">
                                    <h3 style="
                                        margin: 0;
                                        color: #1e293b;
                                        font-size: 16px;
                                        font-weight: 700;
                                        line-height: 1.3;
                                    ">${item.title}</h3>
                                    <div style="
                                        font-size: 12px;
                                        color: #64748b;
                                        margin-top: 2px;
                                    ">Day ${day.day} · ${item.time_label} · ${item.sub_title}</div>
                                </div>
                            </div>
                            <p style="
                                margin: 0 0 12px;
                                color: #475569;
                                font-size: 13px;
                                line-height: 1.6;
                            ">${item.content.desc.length > 80 ? item.content.desc.substring(0, 80) + '...' : item.content.desc}</p>
                            ${item.content.highlight_text ? `
                                <div style="
                                    display: flex;
                                    align-items: flex-start;
                                    gap: 8px;
                                    padding: 10px 12px;
                                    background: ${isFood ? '#fffbeb' : '#f0f9ff'};
                                    border-radius: 8px;
                                    font-size: 12px;
                                    color: ${isFood ? '#92400e' : '#0369a1'};
                                    line-height: 1.5;
                                ">
                                    <span style="flex-shrink: 0;">${isFood ? '🍽️' : '💡'}</span>
                                    <span>${item.content.highlight_text}</span>
                                </div>
                            ` : ''}
                            ${item.cost > 0 ? `
                                <div style="
                                    margin-top: 12px;
                                    display: inline-flex;
                                    align-items: center;
                                    gap: 6px;
                                    padding: 6px 12px;
                                    background: #f0fdf4;
                                    border-radius: 20px;
                                    font-size: 13px;
                                    color: #16a34a;
                                    font-weight: 600;
                                ">
                                    <span>💰</span>
                                    <span>¥${item.cost}</span>
                                </div>
                            ` : ''}
                        </div>
                    `;

                    marker.on('click', () => {
                        // 关闭 hover window
                        if (hoverInfoWindowRef.current) {
                            hoverInfoWindowRef.current.close();
                        }

                        const infoWindow = new AMap.InfoWindow({
                            content: detailContent,
                            offset: new AMap.Pixel(0, -15),
                            isCustom: true,
                        });
                        infoWindow.open(map, lnglat);
                        onMarkerClick?.(dayIndex, itemIndex);
                    });

                    map.add(marker);
                    allMarkers.push(marker);
                    dayMarkers.push(marker);

                    // === 创建可切换可见性的文字标签 (Zoom > 16 时显示) ===
                    const labelText = new AMap.Text({
                        text: item.title,
                        position: lnglat,
                        offset: new AMap.Pixel(0, 15),
                        style: {
                            'background-color': 'white',
                            'border': '1px solid #e2e8f0',
                            'padding': '4px 8px',
                            'font-size': '12px',
                            'font-weight': '600',
                            'color': '#334155',
                            'border-radius': '4px',
                            'box-shadow': '0 2px 6px rgba(0,0,0,0.1)',
                            'opacity': currentZoom > 16 ? 1 : 0,
                            'transition': 'opacity 0.2s ease',
                        },
                    });
                    map.add(labelText);
                    dayLabels.push(labelText);
                });

                markersRef.current.push(dayMarkers);
                labelsRef.current.push(dayLabels);

                // 绘制路线 - Gentle Teal Lines
                if (pathPoints.length > 1) {
                    const polyline = new AMap.Polyline({
                        path: pathPoints,
                        strokeColor: '#2dd4bf', // Teal-400
                        strokeWeight: 5,
                        strokeOpacity: 0.7,
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
        }, [timeline, onMarkerClick, activeMarker, currentZoom]);

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
                            <p className="text-teal-600 font-medium text-sm">地图加载中...</p>
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
                                <span className="text-xs text-slate-600 font-bold">景点</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                                <span className="text-xs text-slate-600 font-bold">美食</span>
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
