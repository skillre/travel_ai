'use client';

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { TripPlanDay, TripPlanItem } from '../types';

export interface MapContainerNewRef {
    panToSpot: (dayIndex: number, itemIndex: number) => void;
    highlightSpot: (dayIndex: number, itemIndex: number) => void;
    clearHighlight: () => void;
    setActiveMarker: (dayIndex: number, itemIndex: number) => void;
    resize: () => void;
    showAllDays: () => void;
    showDay: (dayIndex: number) => void;
    showItemDetail: (dayIndex: number, itemIndex: number) => void;
}

interface MapContainerNewProps {
    timeline: TripPlanDay[];
    selectedDay?: number | null;
    onMarkerClick?: (dayIndex: number, itemIndex: number) => void;
}

// 每天路线的颜色
const dayColors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#06b6d4', '#8b5cf6', '#ec4899',
];

const MapContainerNew = forwardRef<MapContainerNewRef, MapContainerNewProps>(
    ({ timeline, selectedDay = null, onMarkerClick }, ref) => {
        const mapRef = useRef<HTMLDivElement>(null);
        const mapInstance = useRef<any>(null);
        const AMapRef = useRef<any>(null);
        const markersRef = useRef<any[][]>([]);
        const polylinesRef = useRef<any[]>([]);
        const labelsRef = useRef<any[][]>([]);
        const hoverInfoWindowRef = useRef<any>(null);
        const detailInfoWindowRef = useRef<any>(null);
        const [isLoading, setIsLoading] = useState(true);
        const [error, setError] = useState<string | null>(null);
        const [mapReady, setMapReady] = useState(false);
        const [activeMarker, setActiveMarkerState] = useState<{ day: number; item: number } | null>(null);
        const [currentZoom, setCurrentZoom] = useState(12);
        const [visibleDay, setVisibleDay] = useState<number | null>(null);

        // 创建详情内容
        const createDetailContent = useCallback((day: TripPlanDay, item: TripPlanItem, dayIndex: number) => {
            const isFood = item.type === 'food';
            return `
                <div style="
                    padding: 20px;
                    min-width: 300px;
                    max-width: 360px;
                    font-family: system-ui, -apple-system, sans-serif;
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                ">
                    <div style="display: flex; align-items: flex-start; gap: 14px; margin-bottom: 16px;">
                        <div style="
                            width: 56px;
                            height: 56px;
                            border-radius: 14px;
                            background: ${isFood ? '#fff7ed' : '#f0fdfa'};
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 32px;
                            flex-shrink: 0;
                        ">
                            ${item.emoji || (isFood ? '🍽️' : '📍')}
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <h3 style="
                                margin: 0;
                                color: #1e293b;
                                font-size: 18px;
                                font-weight: 700;
                                line-height: 1.3;
                            ">${item.title}</h3>
                            <div style="
                                font-size: 13px;
                                color: #64748b;
                                margin-top: 4px;
                            ">
                                <span style="
                                    display: inline-block;
                                    padding: 2px 8px;
                                    background: ${dayColors[dayIndex % dayColors.length]}20;
                                    color: ${dayColors[dayIndex % dayColors.length]};
                                    border-radius: 4px;
                                    font-weight: 600;
                                    margin-right: 6px;
                                ">Day ${day.day}</span>
                                ${item.time_label}
                            </div>
                            <div style="
                                font-size: 12px;
                                color: #94a3b8;
                                margin-top: 4px;
                            ">${item.sub_title || ''}</div>
                        </div>
                    </div>
                    
                    <p style="
                        margin: 0 0 16px;
                        color: #475569;
                        font-size: 14px;
                        line-height: 1.7;
                    ">${item.content.desc}</p>
                    
                    ${item.tags && item.tags.length > 0 ? `
                        <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px;">
                            ${item.tags.slice(0, 5).map(tag => `
                                <span style="
                                    font-size: 12px;
                                    padding: 4px 10px;
                                    background: ${isFood ? '#fff7ed' : '#f1f5f9'};
                                    color: ${isFood ? '#c2410c' : '#475569'};
                                    border-radius: 6px;
                                ">${tag}</span>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    ${item.content.highlight_text ? `
                        <div style="
                            display: flex;
                            align-items: flex-start;
                            gap: 10px;
                            padding: 14px 16px;
                            background: ${isFood ? '#fffbeb' : '#f0f9ff'};
                            border-radius: 12px;
                            font-size: 13px;
                            color: ${isFood ? '#92400e' : '#0369a1'};
                            line-height: 1.6;
                            margin-bottom: 16px;
                        ">
                            <span style="flex-shrink: 0; font-size: 18px;">${isFood ? '🍽️' : '💡'}</span>
                            <div>
                                <div style="font-weight: 600; margin-bottom: 4px;">${item.content.highlight_label || (isFood ? '推荐' : '贴士')}</div>
                                <span>${item.content.highlight_text}</span>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${item.cost > 0 ? `
                        <div style="
                            display: inline-flex;
                            align-items: center;
                            gap: 8px;
                            padding: 10px 16px;
                            background: #f0fdf4;
                            border-radius: 12px;
                            font-size: 15px;
                            color: #16a34a;
                            font-weight: 600;
                        ">
                            <span>💰</span>
                            <span>预估消费 ¥${item.cost}</span>
                        </div>
                    ` : ''}
                </div>
            `;
        }, []);

        // 更新可见性
        const updateVisibility = useCallback((dayToShow: number | null) => {
            setVisibleDay(dayToShow);

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

        // 显示卡片详情
        const showItemDetailOnMap = useCallback((dayIndex: number, itemIndex: number) => {
            const map = mapInstance.current;
            const AMap = AMapRef.current;
            if (!map || !AMap || !timeline[dayIndex]?.items[itemIndex]) return;

            const day = timeline[dayIndex];
            const item = day.items[itemIndex];
            const lnglat = new AMap.LngLat(item.location.lng, item.location.lat);

            // 关闭之前的详情窗口
            if (detailInfoWindowRef.current) {
                detailInfoWindowRef.current.close();
            }

            const content = createDetailContent(day, item, dayIndex);
            detailInfoWindowRef.current = new AMap.InfoWindow({
                content: content,
                offset: new AMap.Pixel(0, -20),
                isCustom: true,
            });
            detailInfoWindowRef.current.open(map, lnglat);

            // 居中并缩放
            map.setCenter(lnglat);
            map.setZoom(15);
        }, [timeline, createDetailContent]);

        // 暴露方法
        useImperativeHandle(ref, () => ({
            panToSpot: (dayIndex: number, itemIndex: number) => {
                const map = mapInstance.current;
                if (!map || !markersRef.current[dayIndex]?.[itemIndex]) return;

                const marker = markersRef.current[dayIndex][itemIndex];
                const position = marker.getPosition();
                map.setCenter(position);
                map.setZoom(15);
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
                map.setZoom(15);

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
            showItemDetail: (dayIndex: number, itemIndex: number) => {
                showItemDetailOnMap(dayIndex, itemIndex);
            },
        }));

        // 初始化地图 - 使用稳定版本 1.4.15
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
                        mapStyle: 'amap://styles/normal',
                    });

                    mapInstance.current = map;

                    map.on('complete', () => {
                        if (isMounted) {
                            setIsLoading(false);
                            setMapReady(true);
                        }
                    });

                    map.on('zoomchange', () => {
                        const zoom = map.getZoom();
                        setCurrentZoom(zoom);
                    });

                    // 添加控件
                    map.addControl(new AMap.Scale({ position: 'LB' }));
                    map.addControl(new AMap.ToolBar({ position: 'RB', liteStyle: true }));

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

                    const isActive = activeMarker?.day === dayIndex && activeMarker?.item === itemIndex;
                    const dotSize = isActive ? 28 : 22;

                    // Marker 内容
                    const dotContent = `
                        <div style="
                            width: ${dotSize}px;
                            height: ${dotSize}px;
                            border-radius: 50%;
                            background: ${markerColor};
                            border: 3px solid white;
                            box-shadow: 0 3px 12px rgba(0,0,0,0.3);
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: ${isActive ? 12 : 11}px;
                            color: white;
                            font-weight: bold;
                            transition: transform 0.2s ease;
                        ">
                            ${itemIndex + 1}
                        </div>
                    `;

                    const marker = new AMap.Marker({
                        position: lnglat,
                        content: dotContent,
                        offset: new AMap.Pixel(-dotSize / 2, -dotSize / 2),
                        zIndex: isActive ? 200 : 100 + itemIndex,
                    });

                    // Hover 气泡
                    marker.on('mouseover', () => {
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
                                min-width: 150px;
                                max-width: 240px;
                            ">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <span style="font-size: 26px;">${item.emoji || (isFood ? '🍽️' : '📍')}</span>
                                    <div>
                                        <div style="font-size: 15px; font-weight: 600; color: #1e293b; line-height: 1.3;">
                                            ${item.title}
                                        </div>
                                        <div style="font-size: 12px; color: #64748b; margin-top: 3px;">
                                            Day ${day.day} · ${item.time_label}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;

                        hoverInfoWindowRef.current = new AMap.InfoWindow({
                            content: hoverContent,
                            offset: new AMap.Pixel(0, -18),
                            closeWhenClickMap: true,
                            isCustom: true,
                        });
                        hoverInfoWindowRef.current.open(map, lnglat);
                    });

                    marker.on('mouseout', () => {
                        if (hoverInfoWindowRef.current) {
                            hoverInfoWindowRef.current.close();
                            hoverInfoWindowRef.current = null;
                        }
                    });

                    // 点击显示详情
                    marker.on('click', () => {
                        if (hoverInfoWindowRef.current) {
                            hoverInfoWindowRef.current.close();
                        }
                        showItemDetailOnMap(dayIndex, itemIndex);
                        onMarkerClick?.(dayIndex, itemIndex);
                    });

                    map.add(marker);
                    allMarkers.push(marker);
                    dayMarkers.push(marker);

                    // 标签
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
                                opacity: ${currentZoom > 14 ? 1 : 0};
                                pointer-events: none;
                            ">${item.title}</div>
                        `,
                        offset: new AMap.Pixel(0, 18),
                        zIndex: 80,
                    });
                    map.add(labelMarker);
                    dayLabels.push(labelMarker);
                });

                markersRef.current.push(dayMarkers);
                labelsRef.current.push(dayLabels);

                // 路线
                if (pathPoints.length > 1) {
                    const polyline = new AMap.Polyline({
                        path: pathPoints,
                        strokeColor: dayColor,
                        strokeWeight: 6,
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

            if (selectedDay !== null) {
                updateVisibility(selectedDay);
            }
        }, [timeline, onMarkerClick, activeMarker, currentZoom, selectedDay, updateVisibility, showItemDetailOnMap]);

        useEffect(() => {
            if (mapReady && timeline && timeline.length > 0) {
                drawMarkersAndRoutes();
            }
        }, [mapReady, timeline, drawMarkersAndRoutes]);

        useEffect(() => {
            if (mapReady) {
                updateVisibility(selectedDay);
            }
        }, [selectedDay, mapReady, updateVisibility]);

        return (
            <div className="relative w-full h-full bg-slate-100">
                <div ref={mapRef} className="w-full h-full" style={{ minHeight: '300px' }} />

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
                            <p className="text-slate-400 text-xs">请检查网络连接或 API Key 配置</p>
                        </div>
                    </div>
                )}

                {/* 图例 */}
                {timeline && timeline.length > 0 && !isLoading && !error && (
                    <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-md rounded-xl p-4 shadow-xl border border-slate-100 z-10">
                        <p className="text-xs text-slate-500 font-semibold mb-2">图例</p>
                        <div className="space-y-2">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-teal-500 border-2 border-white shadow flex items-center justify-center text-[8px] text-white font-bold">1</div>
                                    <span className="text-xs text-slate-600">景点</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-orange-500 border-2 border-white shadow flex items-center justify-center text-[8px] text-white font-bold">2</div>
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
