'use client';

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { TripPlanDay } from '../types';

export interface MapContainerNewRef {
    panToSpot: (dayIndex: number, itemIndex: number) => void;
    highlightSpot: (dayIndex: number, itemIndex: number) => void;
    clearHighlight: () => void;
    setActiveMarker: (dayIndex: number, itemIndex: number) => void;
    resize: () => void;
    showAllDays: () => void;
    showDay: (dayIndex: number) => void;
}

interface MapContainerNewProps {
    timeline: TripPlanDay[];
    selectedDay?: number | null; // null = 显示全部
    onMarkerClick?: (dayIndex: number, itemIndex: number) => void;
}

// 每天路线的颜色 - 更鲜明的调色板
const dayColors = [
    '#ef4444', // red-500
    '#f97316', // orange-500
    '#eab308', // yellow-500
    '#22c55e', // green-500
    '#06b6d4', // cyan-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
];

/**
 * 地图组件
 * - 支持按天筛选显示
 * - 增大标记和路线
 * - 每天用不同颜色区分
 */
const MapContainerNew = forwardRef<MapContainerNewRef, MapContainerNewProps>(
    ({ timeline, selectedDay = null, onMarkerClick }, ref) => {
        const mapRef = useRef<HTMLDivElement>(null);
        const mapInstance = useRef<any>(null);
        const AMapRef = useRef<any>(null);
        const markersRef = useRef<any[][]>([]);
        const polylinesRef = useRef<any[]>([]); // 存储路线引用
        const labelsRef = useRef<any[][]>([]);
        const hoverInfoWindowRef = useRef<any>(null);
        const [isLoading, setIsLoading] = useState(true);
        const [error, setError] = useState<string | null>(null);
        const [mapReady, setMapReady] = useState(false);
        const [activeMarker, setActiveMarkerState] = useState<{ day: number; item: number } | null>(null);
        const [currentZoom, setCurrentZoom] = useState(12);
        const [visibleDay, setVisibleDay] = useState<number | null>(null);

        // 更新标签可见性（基于缩放级别）
        const updateLabelVisibility = useCallback((zoom: number) => {
            const showLabels = zoom > 15;
            labelsRef.current.forEach((dayLabels, dayIndex) => {
                dayLabels.forEach(label => {
                    if (label) {
                        const shouldShow = showLabels && (visibleDay === null || visibleDay === dayIndex);
                        label.show();
                        label.setStyle({ opacity: shouldShow ? 1 : 0 });
                    }
                });
            });
        }, [visibleDay]);

        // 更新可见天数
        const updateVisibility = useCallback((dayToShow: number | null) => {
            setVisibleDay(dayToShow);

            // 更新标记和路线可见性
            markersRef.current.forEach((dayMarkers, dayIndex) => {
                dayMarkers.forEach(marker => {
                    if (dayToShow === null || dayToShow === dayIndex) {
                        marker.show();
                    } else {
                        marker.hide();
                    }
                });
            });

            labelsRef.current.forEach((dayLabels, dayIndex) => {
                dayLabels.forEach(label => {
                    if (dayToShow === null || dayToShow === dayIndex) {
                        label.show();
                    } else {
                        label.hide();
                    }
                });
            });

            polylinesRef.current.forEach((polyline, dayIndex) => {
                if (polyline) {
                    if (dayToShow === null || dayToShow === dayIndex) {
                        polyline.show();
                    } else {
                        polyline.hide();
                    }
                }
            });

            // 调整视图以适应可见的标记
            const map = mapInstance.current;
            if (map) {
                const visibleMarkers: any[] = [];
                markersRef.current.forEach((dayMarkers, dayIndex) => {
                    if (dayToShow === null || dayToShow === dayIndex) {
                        visibleMarkers.push(...dayMarkers);
                    }
                });
                if (visibleMarkers.length > 0) {
                    map.setFitView(visibleMarkers, false, [60, 60, 60, 60]);
                }
            }
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
                const map = mapInstance.current;
                if (!map || !markersRef.current[dayIndex]?.[itemIndex]) return;
                const marker = markersRef.current[dayIndex][itemIndex];
                const position = marker.getPosition();
                map.setCenter(position);
                map.setZoom(16);

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
            showAllDays: () => {
                updateVisibility(null);
            },
            showDay: (dayIndex: number) => {
                updateVisibility(dayIndex);
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
                        version: '2.0',
                        plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.InfoWindow'],
                    });

                    if (!isMounted || !mapRef.current) return;

                    AMapRef.current = AMap;

                    const map = new AMap.Map(mapRef.current, {
                        zoom: 12,
                        center: [118.089, 24.479],
                        resizeEnable: true,
                        mapStyle: 'amap://styles/normal',
                        scrollWheel: true,
                        doubleClickZoom: true,
                        touchZoom: true,
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

                    // 添加缩放控件 - 确保显示
                    const scale = new AMap.Scale({
                        position: 'LB',
                    });
                    map.addControl(scale);

                    const toolbar = new AMap.ToolBar({
                        position: {
                            bottom: '110px',
                            right: '20px',
                        },
                    });
                    map.addControl(toolbar);

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
            polylinesRef.current = [];

            const allMarkers: any[] = [];

            timeline.forEach((day, dayIndex) => {
                const dayColor = dayColors[dayIndex % dayColors.length];
                const pathPoints: any[] = [];
                const dayMarkers: any[] = [];
                const dayLabels: any[] = [];

                day.items.forEach((item, itemIndex) => {
                    const lnglat = new AMap.LngLat(item.location.lng, item.location.lat);
                    pathPoints.push(lnglat);

                    const isFood = item.type === 'food';
                    const markerColor = isFood ? '#f97316' : '#14b8a6';

                    // 增大 Marker 尺寸
                    const isActive = activeMarker?.day === dayIndex && activeMarker?.item === itemIndex;
                    const dotSize = isActive ? 28 : 20;
                    const borderWidth = isActive ? 4 : 3;

                    const dotContent = `
                        <div class="map-dot-marker" style="
                            width: ${dotSize}px;
                            height: ${dotSize}px;
                            border-radius: 50%;
                            background: ${markerColor};
                            border: ${borderWidth}px solid white;
                            box-shadow: 0 3px 12px rgba(0,0,0,0.3);
                            cursor: pointer;
                            transition: all 0.2s ease;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: ${isActive ? 14 : 12}px;
                        ">
                            <span style="color: white; font-weight: bold;">${itemIndex + 1}</span>
                        </div>
                    `;

                    const marker = new AMap.Marker({
                        position: lnglat,
                        content: dotContent,
                        offset: new AMap.Pixel(-dotSize / 2, -dotSize / 2),
                        zIndex: isActive ? 200 : 100 + itemIndex,
                    });

                    // Hover 显示气泡
                    marker.on('mouseenter', () => {
                        if (hoverInfoWindowRef.current) {
                            hoverInfoWindowRef.current.close();
                        }

                        const hoverContent = `
                            <div style="
                                padding: 12px 16px;
                                background: white;
                                border-radius: 12px;
                                box-shadow: 0 4px 24px rgba(0,0,0,0.18);
                                font-family: system-ui, sans-serif;
                                min-width: 140px;
                                max-width: 220px;
                            ">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <span style="font-size: 24px;">${item.emoji || (isFood ? '🍽️' : '📍')}</span>
                                    <div>
                                        <div style="font-size: 15px; font-weight: 600; color: #1e293b; line-height: 1.3;">
                                            ${item.title}
                                        </div>
                                        <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
                                            Day ${day.day} · ${item.time_label}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;

                        hoverInfoWindowRef.current = new AMap.InfoWindow({
                            content: hoverContent,
                            offset: new AMap.Pixel(0, -16),
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

                    // Click 显示详细信息
                    const detailContent = `
                        <div style="
                            padding: 18px;
                            min-width: 280px;
                            max-width: 340px;
                            font-family: system-ui, sans-serif;
                            background: white;
                            border-radius: 14px;
                            box-shadow: 0 8px 32px rgba(0,0,0,0.15);
                        ">
                            <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px;">
                                <div style="
                                    width: 50px;
                                    height: 50px;
                                    border-radius: 12px;
                                    background: ${isFood ? '#fff7ed' : '#f0fdfa'};
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    font-size: 28px;
                                    flex-shrink: 0;
                                ">
                                    ${item.emoji || (isFood ? '🍽️' : '📍')}
                                </div>
                                <div style="flex: 1; min-width: 0;">
                                    <h3 style="
                                        margin: 0;
                                        color: #1e293b;
                                        font-size: 17px;
                                        font-weight: 700;
                                        line-height: 1.3;
                                    ">${item.title}</h3>
                                    <div style="
                                        font-size: 13px;
                                        color: #64748b;
                                        margin-top: 4px;
                                    ">Day ${day.day} · ${item.time_label}</div>
                                    <div style="
                                        font-size: 12px;
                                        color: #94a3b8;
                                        margin-top: 2px;
                                    ">${item.sub_title}</div>
                                </div>
                            </div>
                            <p style="
                                margin: 0 0 14px;
                                color: #475569;
                                font-size: 14px;
                                line-height: 1.6;
                            ">${item.content.desc}</p>
                            ${item.content.highlight_text ? `
                                <div style="
                                    display: flex;
                                    align-items: flex-start;
                                    gap: 10px;
                                    padding: 12px 14px;
                                    background: ${isFood ? '#fffbeb' : '#f0f9ff'};
                                    border-radius: 10px;
                                    font-size: 13px;
                                    color: ${isFood ? '#92400e' : '#0369a1'};
                                    line-height: 1.5;
                                ">
                                    <span style="flex-shrink: 0;">${isFood ? '🍽️' : '💡'}</span>
                                    <span>${item.content.highlight_text}</span>
                                </div>
                            ` : ''}
                            ${item.cost > 0 ? `
                                <div style="
                                    margin-top: 14px;
                                    display: inline-flex;
                                    align-items: center;
                                    gap: 6px;
                                    padding: 8px 14px;
                                    background: #f0fdf4;
                                    border-radius: 20px;
                                    font-size: 14px;
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
                        if (hoverInfoWindowRef.current) {
                            hoverInfoWindowRef.current.close();
                        }

                        const infoWindow = new AMap.InfoWindow({
                            content: detailContent,
                            offset: new AMap.Pixel(0, -18),
                            isCustom: true,
                        });
                        infoWindow.open(map, lnglat);
                        onMarkerClick?.(dayIndex, itemIndex);
                    });

                    map.add(marker);
                    allMarkers.push(marker);
                    dayMarkers.push(marker);

                    // 标签（高缩放时显示）
                    const labelMarker = new AMap.Marker({
                        position: lnglat,
                        content: `
                            <div style="
                                background: white;
                                border: 1px solid #e2e8f0;
                                padding: 5px 10px;
                                font-size: 12px;
                                font-weight: 600;
                                color: #334155;
                                border-radius: 6px;
                                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                                white-space: nowrap;
                                opacity: ${currentZoom > 15 ? 1 : 0};
                                transition: opacity 0.2s ease;
                            ">${item.title}</div>
                        `,
                        offset: new AMap.Pixel(0, 20),
                        zIndex: 90,
                    });
                    map.add(labelMarker);
                    dayLabels.push(labelMarker);
                });

                markersRef.current.push(dayMarkers);
                labelsRef.current.push(dayLabels);

                // 绘制路线 - 增粗，每天不同颜色
                if (pathPoints.length > 1) {
                    const polyline = new AMap.Polyline({
                        path: pathPoints,
                        strokeColor: dayColor,
                        strokeWeight: 8,
                        strokeOpacity: 0.85,
                        strokeStyle: 'solid',
                        lineJoin: 'round',
                        lineCap: 'round',
                        showDir: true,
                        zIndex: 50,
                    });
                    map.add(polyline);
                    polylinesRef.current.push(polyline);
                } else {
                    polylinesRef.current.push(null);
                }
            });

            if (allMarkers.length > 0) {
                map.setFitView(allMarkers, false, [60, 60, 60, 60]);
            }

            // 应用当前筛选
            if (selectedDay !== null) {
                updateVisibility(selectedDay);
            }
        }, [timeline, onMarkerClick, activeMarker, currentZoom, selectedDay, updateVisibility]);

        useEffect(() => {
            if (mapReady && timeline && timeline.length > 0) {
                drawMarkersAndRoutes();
            }
        }, [mapReady, timeline, drawMarkersAndRoutes]);

        // 监听 selectedDay 变化
        useEffect(() => {
            if (mapReady) {
                updateVisibility(selectedDay);
            }
        }, [selectedDay, mapReady, updateVisibility]);

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

                {/* 图例 - 显示每天颜色 */}
                {timeline && timeline.length > 0 && !isLoading && !error && (
                    <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-md rounded-xl p-4 shadow-xl border border-slate-100 z-10">
                        <p className="text-xs text-slate-500 font-semibold mb-2">图例</p>
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-teal-500 border-2 border-white shadow"></div>
                                    <span className="text-xs text-slate-600">景点</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-orange-500 border-2 border-white shadow"></div>
                                    <span className="text-xs text-slate-600">美食</span>
                                </div>
                            </div>
                            <div className="pt-2 border-t border-slate-100">
                                <p className="text-[10px] text-slate-400 mb-1.5">路线颜色</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {timeline.map((day, index) => (
                                        <div key={day.day} className="flex items-center gap-1">
                                            <div
                                                className="w-3 h-3 rounded-sm"
                                                style={{ backgroundColor: dayColors[index % dayColors.length] }}
                                            />
                                            <span className="text-[10px] text-slate-500">D{day.day}</span>
                                        </div>
                                    ))}
                                </div>
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
