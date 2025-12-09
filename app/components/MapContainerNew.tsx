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

// 每天路线的颜色 - 鲜明的调色板
const dayColors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#06b6d4', '#8b5cf6', '#ec4899',
];

const MapContainerNew = forwardRef<MapContainerNewRef, MapContainerNewProps>(
    ({ timeline, selectedDay = null, onMarkerClick }, ref) => {
        const mapContainerRef = useRef<HTMLDivElement>(null);
        const mapInstance = useRef<any>(null);
        const AMapRef = useRef<any>(null);
        const markersRef = useRef<any[][]>([]);
        const polylinesRef = useRef<any[]>([]);
        const hoverInfoWindowRef = useRef<any>(null);
        const detailInfoWindowRef = useRef<any>(null);
        const isInitializedRef = useRef(false);

        const [isLoading, setIsLoading] = useState(true);
        const [error, setError] = useState<string | null>(null);
        const [mapReady, setMapReady] = useState(false);

        // 创建详情内容
        const createDetailContent = useCallback((day: TripPlanDay, item: TripPlanItem, dayIndex: number) => {
            const isFood = item.type === 'food';
            return `
                <div style="
                    padding: 18px;
                    min-width: 280px;
                    max-width: 340px;
                    font-family: system-ui, -apple-system, sans-serif;
                    background: white;
                    border-radius: 14px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.18);
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
                            ${item.sub_title ? `<div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">${item.sub_title}</div>` : ''}
                        </div>
                    </div>
                    
                    <p style="
                        margin: 0 0 14px;
                        color: #475569;
                        font-size: 14px;
                        line-height: 1.7;
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
                            line-height: 1.6;
                            margin-bottom: 14px;
                        ">
                            <span style="flex-shrink: 0; font-size: 16px;">${isFood ? '🍽️' : '💡'}</span>
                            <span>${item.content.highlight_text}</span>
                        </div>
                    ` : ''}
                    
                    ${item.cost > 0 ? `
                        <div style="
                            display: inline-flex;
                            align-items: center;
                            gap: 6px;
                            padding: 8px 14px;
                            background: #f0fdf4;
                            border-radius: 10px;
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
        }, []);

        // 更新可见性 - 不触发 setFitView
        const updateVisibility = useCallback((dayToShow: number | null) => {
            markersRef.current.forEach((dayMarkers, dayIndex) => {
                dayMarkers.forEach(marker => {
                    if (dayToShow === null || dayToShow === dayIndex) {
                        marker.show();
                    } else {
                        marker.hide();
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
        }, []);

        // 显示卡片详情
        const showItemDetailOnMap = useCallback((dayIndex: number, itemIndex: number) => {
            const map = mapInstance.current;
            const AMap = AMapRef.current;
            if (!map || !AMap || !timeline[dayIndex]?.items[itemIndex]) return;

            const day = timeline[dayIndex];
            const item = day.items[itemIndex];
            const lnglat = new AMap.LngLat(item.location.lng, item.location.lat);

            if (detailInfoWindowRef.current) {
                detailInfoWindowRef.current.close();
            }

            const content = createDetailContent(day, item, dayIndex);
            detailInfoWindowRef.current = new AMap.InfoWindow({
                content: content,
                offset: new AMap.Pixel(0, -18),
                isCustom: true,
            });
            detailInfoWindowRef.current.open(map, lnglat);

            map.panTo(lnglat);
        }, [timeline, createDetailContent]);

        // 暴露方法
        useImperativeHandle(ref, () => ({
            panToSpot: (dayIndex: number, itemIndex: number) => {
                const map = mapInstance.current;
                if (!map || !markersRef.current[dayIndex]?.[itemIndex]) return;
                const marker = markersRef.current[dayIndex][itemIndex];
                map.panTo(marker.getPosition());
            },
            highlightSpot: (dayIndex: number, itemIndex: number) => {
                const marker = markersRef.current[dayIndex]?.[itemIndex];
                if (marker) {
                    marker.setAnimation('AMAP_ANIMATION_BOUNCE');
                    setTimeout(() => marker.setAnimation('AMAP_ANIMATION_NONE'), 1500);
                }
            },
            clearHighlight: () => { },
            setActiveMarker: (dayIndex: number, itemIndex: number) => {
                const map = mapInstance.current;
                if (!map || !markersRef.current[dayIndex]?.[itemIndex]) return;
                const marker = markersRef.current[dayIndex][itemIndex];
                map.panTo(marker.getPosition());
                marker.setAnimation('AMAP_ANIMATION_BOUNCE');
                setTimeout(() => marker.setAnimation('AMAP_ANIMATION_NONE'), 1500);
            },
            resize: () => {
                if (mapInstance.current) {
                    setTimeout(() => mapInstance.current.resize(), 100);
                }
            },
            showAllDays: () => {
                updateVisibility(null);
                // 适应所有可见标记
                const map = mapInstance.current;
                if (map) {
                    const allMarkers = markersRef.current.flat();
                    if (allMarkers.length > 0) {
                        map.setFitView(allMarkers, false, [80, 80, 80, 80]);
                    }
                }
            },
            showDay: (dayIndex: number) => {
                updateVisibility(dayIndex);
                // 适应选中天的标记
                const map = mapInstance.current;
                if (map && markersRef.current[dayIndex]) {
                    const dayMarkers = markersRef.current[dayIndex];
                    if (dayMarkers.length > 0) {
                        map.setFitView(dayMarkers, false, [80, 80, 80, 80]);
                    }
                }
            },
            showItemDetail: (dayIndex: number, itemIndex: number) => {
                showItemDetailOnMap(dayIndex, itemIndex);
            },
        }));

        // 绘制标记和路线 - 只在初始化时调用一次
        const drawMarkersAndRoutes = useCallback(() => {
            const map = mapInstance.current;
            const AMap = AMapRef.current;

            if (!map || !AMap || !timeline || timeline.length === 0) return;
            if (isInitializedRef.current) return; // 防止重复绘制

            isInitializedRef.current = true;
            map.clearMap();
            markersRef.current = [];
            polylinesRef.current = [];

            const allMarkers: any[] = [];

            timeline.forEach((day, dayIndex) => {
                const dayColor = dayColors[dayIndex % dayColors.length];
                const pathPoints: any[] = [];
                const dayMarkers: any[] = [];

                day.items.forEach((item, itemIndex) => {
                    const lnglat = new AMap.LngLat(item.location.lng, item.location.lat);
                    pathPoints.push(lnglat);

                    const isFood = item.type === 'food';
                    const markerColor = isFood ? '#f97316' : '#14b8a6';

                    // Marker 内容 - 带序号的圆点
                    const dotContent = `
                        <div style="
                            width: 26px;
                            height: 26px;
                            border-radius: 50%;
                            background: ${markerColor};
                            border: 3px solid white;
                            box-shadow: 0 3px 10px rgba(0,0,0,0.3);
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 12px;
                            color: white;
                            font-weight: bold;
                        ">
                            ${itemIndex + 1}
                        </div>
                    `;

                    const marker = new AMap.Marker({
                        position: lnglat,
                        content: dotContent,
                        offset: new AMap.Pixel(-13, -13),
                        zIndex: 100 + itemIndex,
                    });

                    // Hover 气泡
                    marker.on('mouseover', () => {
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
                                min-width: 140px;
                                max-width: 220px;
                            ">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="font-size: 22px;">${item.emoji || (isFood ? '🍽️' : '📍')}</span>
                                    <div>
                                        <div style="font-size: 14px; font-weight: 600; color: #1e293b;">
                                            ${item.title}
                                        </div>
                                        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
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
                        // showItemDetailOnMap(dayIndex, itemIndex);
                        onMarkerClick?.(dayIndex, itemIndex);
                    });

                    map.add(marker);
                    allMarkers.push(marker);
                    dayMarkers.push(marker);
                });

                markersRef.current.push(dayMarkers);

                // 路线 - 更粗更明显
                if (pathPoints.length > 1) {
                    const polyline = new AMap.Polyline({
                        path: pathPoints,
                        strokeColor: dayColor,
                        strokeWeight: 8,
                        strokeOpacity: 0.9,
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
                map.setFitView(allMarkers, false, [80, 80, 80, 80]);
            }

            // 应用初始筛选
            if (selectedDay !== null) {
                updateVisibility(selectedDay);
            }
        }, [timeline, onMarkerClick, selectedDay, updateVisibility, showItemDetailOnMap]);

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

                    if (!isMounted || !mapContainerRef.current) return;

                    AMapRef.current = AMap;

                    const map = new AMap.Map(mapContainerRef.current, {
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

                    // 添加控件 - 调整位置避免遮挡
                    const scale = new AMap.Scale({ position: 'LT' });
                    map.addControl(scale);

                    const toolbar = new AMap.ToolBar({
                        position: 'RT',
                        liteStyle: true,
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
                isInitializedRef.current = false;
            };
        }, []);

        // 地图准备好后绘制
        useEffect(() => {
            if (mapReady && timeline && timeline.length > 0) {
                drawMarkersAndRoutes();
            }
        }, [mapReady, timeline, drawMarkersAndRoutes]);

        // 监听 selectedDay 变化更新可见性
        useEffect(() => {
            if (mapReady && isInitializedRef.current) {
                updateVisibility(selectedDay);
            }
        }, [selectedDay, mapReady, updateVisibility]);

        return (
            <div className="relative w-full h-full bg-slate-100">
                <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '300px' }} />

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

                {/* 图例 - 调整位置到左下角并留出空间 */}
                {timeline && timeline.length > 0 && !isLoading && !error && (
                    <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-md rounded-lg p-3 shadow-lg border border-slate-200 z-10 max-w-[200px]">
                        <p className="text-[11px] text-slate-500 font-semibold mb-1.5">图例</p>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center gap-1">
                                <div className="w-3.5 h-3.5 rounded-full bg-teal-500 border border-white shadow text-[7px] text-white font-bold flex items-center justify-center">1</div>
                                <span className="text-[11px] text-slate-600">景点</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3.5 h-3.5 rounded-full bg-orange-500 border border-white shadow text-[7px] text-white font-bold flex items-center justify-center">2</div>
                                <span className="text-[11px] text-slate-600">美食</span>
                            </div>
                        </div>
                        <div className="pt-1.5 border-t border-slate-100">
                            <p className="text-[9px] text-slate-400 mb-1">路线</p>
                            <div className="flex flex-wrap gap-1">
                                {timeline.map((day, index) => (
                                    <div key={day.day} className="flex items-center gap-0.5">
                                        <div
                                            className="w-2.5 h-2.5 rounded-sm"
                                            style={{ backgroundColor: dayColors[index % dayColors.length] }}
                                        />
                                        <span className="text-[9px] text-slate-500">D{day.day}</span>
                                    </div>
                                ))}
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
