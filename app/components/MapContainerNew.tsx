'use client';

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { TripPlanDay, TripPlanItem } from '../types';
import 'mapbox-gl/dist/mapbox-gl.css';

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
    onReady?: (methods: MapContainerNewRef) => void; // 组件就绪时回调
    provider?: 'amap' | 'mapbox';
}

// 每天路线的颜色 - 鲜明的调色板
const dayColors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#06b6d4', '#8b5cf6', '#ec4899',
];

const MapContainerNew = forwardRef<MapContainerNewRef, MapContainerNewProps>(
    ({ timeline, selectedDay = null, onMarkerClick, onReady, provider = 'amap' }, ref) => {
        const mapContainerRef = useRef<HTMLDivElement>(null);
        const mapInstance = useRef<any>(null);
        const AMapRef = useRef<any>(null);
        const mapboxRef = useRef<any>(null);
        const markersRef = useRef<any[][]>([]);
        const polylinesRef = useRef<any[][]>([]); // 按天分组存储路线和交通图标
        const mapboxExtrasRef = useRef<any[][]>([]); // Mapbox 额外标记（如中点交通图标）
        const mapboxHoverPopupRef = useRef<any>(null);
        const hoverInfoWindowRef = useRef<any>(null);
        const detailInfoWindowRef = useRef<any>(null);
        const isInitializedRef = useRef(false);

        const [isLoading, setIsLoading] = useState(true);
        const [error, setError] = useState<string | null>(null);
        const [mapReady, setMapReady] = useState(false);

        const getFitPadding = useCallback(() => {
            const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
            if (isMobile) {
                const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;
                const bottom = Math.max(260, Math.min(520, Math.round(screenH * 0.45)));
                return {
                    mapbox: { top: 140, right: 60, bottom, left: 60 },
                    amap: [60, 140, 60, bottom] as [number, number, number, number],
                };
            }
            return {
                mapbox: { top: 80, right: 80, bottom: 80, left: 80 },
                amap: [80, 80, 80, 80] as [number, number, number, number],
            };
        }, []);

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
                            ${item.address ? `<div style="font-size: 12px; color: #0d9488; margin-top: 6px; display: flex; align-items: flex-start; gap: 4px;"><span style="flex-shrink: 0;">📍</span><span style="line-height: 1.4;">${item.address}</span></div>` : ''}
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
            // 更新标记可见性
            markersRef.current.forEach((dayMarkers, dayIndex) => {
                dayMarkers.forEach(marker => {
                    if (marker && typeof marker.show === 'function') {
                        if (dayToShow === null || dayToShow === dayIndex) {
                            marker.show();
                        } else {
                            marker.hide();
                        }
                    }
                });
            });

            // 更新路线和交通图标可见性
            polylinesRef.current.forEach((dayPolylines, dayIndex) => {
                if (dayPolylines) {
                    dayPolylines.forEach(item => {
                        if (item && typeof item.show === 'function') {
                            if (dayToShow === null || dayToShow === dayIndex) {
                                item.show();
                            } else {
                                item.hide();
                            }
                        }
                    });
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

        // Helper to calculate distance
        const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number) => {
            const R = 6371e3; // metres
            const φ1 = lat1 * Math.PI / 180;
            const φ2 = lat2 * Math.PI / 180;
            const Δφ = (lat2 - lat1) * Math.PI / 180;
            const Δλ = (lng2 - lng1) * Math.PI / 180;

            const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

            return R * c; // in metres
        }, []);

        // 计算预估时间
        const getEstimatedTime = useCallback((distanceInMeters: number, isWalking: boolean) => {
            if (isWalking) {
                // 步行约 5km/h = 83m/min
                const minutes = Math.round(distanceInMeters / 83);
                return minutes < 1 ? '1分钟' : `${minutes}分钟`;
            } else {
                // 驾车约 30km/h (城市路况) = 500m/min
                const minutes = Math.round(distanceInMeters / 500);
                return minutes < 1 ? '1分钟' : `${minutes}分钟`;
            }
        }, []);

        // 绘制标记和路线 - 只在初始化时调用一次
        const drawMarkersAndRoutes = useCallback(() => {
            const map = mapInstance.current;
            if (!map || !timeline || timeline.length === 0) return;
            if (provider === 'mapbox') {
                markersRef.current.forEach(dayMarkers => dayMarkers?.forEach((mk: any) => {
                    try { mk.remove?.(); } catch { }
                }));
                mapboxExtrasRef.current.forEach(dayMarkers => dayMarkers?.forEach((mk: any) => {
                    try { mk.remove?.(); } catch { }
                }));
                polylinesRef.current.forEach(dayLayers => {
                    dayLayers?.forEach((item: any) => {
                        const layerId = item?.layerId;
                        const sourceId = item?.sourceId;
                        if (layerId && map.getLayer?.(layerId)) {
                            try { map.removeLayer(layerId); } catch { }
                        }
                        if (sourceId && map.getSource?.(sourceId)) {
                            try { map.removeSource(sourceId); } catch { }
                        }
                    });
                });

                const animateTwoBounces = (target: HTMLElement) => {
                    target.style.transition = 'transform 0.18s ease';
                    target.style.transform = 'translateZ(0) scale(1.18)';
                    setTimeout(() => { target.style.transform = 'translateZ(0) scale(1)'; }, 180);
                    setTimeout(() => {
                        target.style.transform = 'translateZ(0) scale(1.18)';
                        setTimeout(() => { target.style.transform = 'translateZ(0) scale(1)'; }, 180);
                    }, 220);
                };

                markersRef.current = [];
                polylinesRef.current = [];
                mapboxExtrasRef.current = [];
                if (mapboxHoverPopupRef.current) {
                    try { mapboxHoverPopupRef.current.remove?.(); } catch { }
                    mapboxHoverPopupRef.current = null;
                }
                const allCoords: [number, number][] = [];

                timeline.forEach((day, dayIndex) => {
                    const dayColor = dayColors[dayIndex % dayColors.length];
                    const dayMarkers: any[] = [];
                    const dayExtras: any[] = [];
                    const pathCoords: [number, number][] = [];

                    let prevItem: TripPlanItem | null = null;

                    day.items.forEach((item, itemIndex) => {
                        const isFood = item.type === 'food';
                        const markerColor = isFood ? '#f97316' : '#0d9488';

                        const outerEl = document.createElement('div');
                        outerEl.style.width = '32px';
                        outerEl.style.height = '40px';
                        outerEl.style.cursor = 'pointer';

                        const animEl = document.createElement('div');
                        animEl.style.width = '32px';
                        animEl.style.height = '40px';
                        animEl.style.position = 'relative';
                        animEl.style.transformOrigin = '50% 100%';
                        animEl.style.transform = 'translateZ(0)';
                        animEl.innerHTML = `
                            <div style="
                                position:absolute;top:0;left:50%;
                                width:28px;height:28px;margin-left:-14px;
                                background:${markerColor};
                                border-radius:50% 50% 50% 0;
                                transform:rotate(-45deg);
                                box-shadow:0 3px 10px rgba(0,0,0,0.35);
                                border:2.5px solid white;
                            ">
                                <div style="
                                    position:absolute;top:50%;left:50%;
                                    transform:translate(-50%,-50%) rotate(45deg);
                                    color:white;font-weight:bold;font-size:12px;
                                    text-shadow:0 1px 2px rgba(0,0,0,0.3);
                                ">${itemIndex + 1}</div>
                            </div>
                        `;
                        outerEl.appendChild(animEl);

                        const marker = new mapboxRef.current.Marker({ element: outerEl, offset: [0, -20] })
                            .setLngLat([item.location.lng, item.location.lat])
                            .addTo(map);

                        // Hover：显示名称并双次跳动
                        const handleHover = () => {
                            if (mapboxHoverPopupRef.current) {
                                try { mapboxHoverPopupRef.current.remove?.(); } catch { }
                                mapboxHoverPopupRef.current = null;
                            }
                            try {
                                const popupHtml = `
                                    <div style="padding:10px 14px;background:white;border-radius:12px;
                                        box-shadow:0 8px 24px rgba(0,0,0,0.2);font-family:system-ui;
                                        min-width:140px;max-width:240px;border:1px solid rgba(0,0,0,0.05)">
                                        <div style="display:flex;align-items:center;gap:10px;">
                                            <div style="width:36px;height:36px;background:${isFood ? '#fff7ed' : '#f0fdfa'};
                                                border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px;">
                                                ${item.emoji || (isFood ? '🍽️' : '📍')}
                                            </div>
                                            <div>
                                                <div style="font-size:14px;font-weight:700;color:#1e293b;line-height:1.2;margin-bottom:2px;">
                                                    ${item.title}
                                                </div>
                                                <div style="font-size:11px;color:#64748b;display:flex;align-items:center;gap:4px;">
                                                    <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${dayColor};"></span>
                                                    Day ${day.day} · ${item.time_label || ''}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                `;
                                mapboxHoverPopupRef.current = new mapboxRef.current.Popup({ offset: [0, -28], closeButton: false, closeOnClick: true })
                                    .setLngLat([item.location.lng, item.location.lat])
                                    .setHTML(popupHtml)
                                    .addTo(map);
                            } catch {}
                            animateTwoBounces(animEl);
                        };
                        outerEl.addEventListener('mouseenter', handleHover);
                        outerEl.addEventListener('mouseleave', () => {
                            if (mapboxHoverPopupRef.current) {
                                try { mapboxHoverPopupRef.current.remove?.(); } catch { }
                                mapboxHoverPopupRef.current = null;
                            }
                        });

                        // 点击联动详情
                        outerEl.addEventListener('click', () => {
                            if (mapboxHoverPopupRef.current) {
                                try { mapboxHoverPopupRef.current.remove?.(); } catch { }
                                mapboxHoverPopupRef.current = null;
                            }
                            const html = `
                                <div style="padding:16px;min-width:240px;max-width:320px;font-family:system-ui">
                                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                                        <span style="font-size:28px;">${item.emoji || '📍'}</span>
                                        <div>
                                            <h3 style="margin:0;color:${dayColor};font-size:18px;font-weight:bold">${item.title}</h3>
                                            <span style="font-size:12px;color:#888">Day ${day.day} · 第${itemIndex + 1}站</span>
                                        </div>
                                    </div>
                                    <p style="margin:0;color:#555;font-size:14px;line-height:1.6">${item.content?.desc || ''}</p>
                                </div>
                            `;
                            new mapboxRef.current.Popup({ offset: 25 }).setHTML(html).setLngLat([item.location.lng, item.location.lat]).addTo(map);
                            onMarkerClick?.(dayIndex, itemIndex);
                        });

                        dayMarkers.push(marker);
                        pathCoords.push([item.location.lng, item.location.lat]);
                        if (item.location && (item.location.lng !== 0 || item.location.lat !== 0)) {
                            allCoords.push([item.location.lng, item.location.lat]);
                        }

                        // 路线中点交通图标与用时
                        if (prevItem) {
                            const distance = calculateDistance(
                                prevItem.location.lat, prevItem.location.lng,
                                item.location.lat, item.location.lng
                            );
                            const isWalking = distance < 2000;
                            const estimatedTime = getEstimatedTime(distance, isWalking);
                            const midLat = (prevItem.location.lat + item.location.lat) / 2;
                            const midLng = (prevItem.location.lng + item.location.lng) / 2;

                            const midEl = document.createElement('div');
                            midEl.style.display = 'inline-flex';
                            midEl.style.flexDirection = 'column';
                            midEl.style.alignItems = 'center';
                            midEl.style.gap = '2px';
                            midEl.innerHTML = `
                                <div style="background:white;padding:4px 6px;border-radius:12px;
                                    box-shadow:0 2px 8px rgba(0,0,0,0.2);border:2px solid ${dayColor};font-size:14px;">
                                    ${isWalking ? '🚶' : '🚗'}
                                </div>
                                <div style="background:${dayColor};color:white;padding:2px 6px;border-radius:8px;
                                    font-size:9px;font-weight:600;white-space:nowrap;">约${estimatedTime}</div>
                            `;
                            const midMarker = new mapboxRef.current.Marker({ element: midEl, offset: [-20, -25] })
                                .setLngLat([midLng, midLat])
                                .addTo(map);
                            dayExtras.push(midMarker);
                        }

                        prevItem = item;
                    });

                    markersRef.current.push(dayMarkers);
                    mapboxExtrasRef.current[dayIndex] = dayExtras;

                    if (pathCoords.length > 1) {
                        const sourceId = `route-src-${dayIndex}`;
                        const layerId = `route-layer-${dayIndex}`;
                        if (map.getLayer(layerId)) {
                            map.removeLayer(layerId);
                        }
                        if (map.getSource(sourceId)) {
                            map.removeSource(sourceId);
                        }
                        map.addSource(sourceId, {
                            type: 'geojson',
                            data: {
                                type: 'Feature',
                                geometry: {
                                    type: 'LineString',
                                    coordinates: pathCoords
                                }
                            }
                        });
                        map.addLayer({
                            id: layerId,
                            type: 'line',
                            source: sourceId,
                            layout: { 'line-join': 'round', 'line-cap': 'round' },
                            paint: {
                                'line-color': dayColor,
                                'line-width': 5,
                                'line-opacity': 0.85
                            }
                        });
                        polylinesRef.current[dayIndex] = [{ layerId, sourceId }];
                    }
                });

                if (allCoords.length > 0) {
                    const { mapbox: padding } = getFitPadding();
                    const bounds = new mapboxRef.current.LngLatBounds(allCoords[0], allCoords[0]);
                    for (const c of allCoords) bounds.extend(c);
                    map.fitBounds(bounds, { padding, duration: 0, maxZoom: 16 });
                }

                isInitializedRef.current = true;
                if (selectedDay !== null) {
                    updateVisibility(selectedDay);
                }
                return;
            }
            const AMap = AMapRef.current;

            if (!AMap) return;
            // Removed isInitializedRef check to allow updates when timeline changes

            isInitializedRef.current = true;
            map.clearMap();
            markersRef.current = [];
            polylinesRef.current = [];

            const allMarkers: any[] = [];

            timeline.forEach((day, dayIndex) => {
                const dayColor = dayColors[dayIndex % dayColors.length];
                const dayMarkers: any[] = [];
                const dayPolylines: any[] = []; // 这一天的路线和交通图标

                // 追踪上一个 item 以绘制路线
                let prevItem: TripPlanItem | null = null;
                let prevLngLat: any = null;

                day.items.forEach((item, itemIndex) => {
                    const lnglat = new AMap.LngLat(item.location.lng, item.location.lat);

                    const isFood = item.type === 'food';
                    const markerColor = isFood ? '#f97316' : '#0d9488'; // 橙色/深青色
                    const zIndex = 100 + (timeline.length - dayIndex) * 100 + itemIndex;

                    // Marker 内容 - 简洁的水滴形 Pin 设计
                    const pinContent = `
                        <div class="map-marker-pin" style="
                            width: 32px;
                            height: 40px;
                            position: relative;
                            cursor: pointer;
                        ">
                            <div style="
                                position: absolute;
                                top: 0;
                                left: 50%;
                                width: 28px;
                                height: 28px;
                                margin-left: -14px;
                                background: ${markerColor};
                                border-radius: 50% 50% 50% 0;
                                transform: rotate(-45deg);
                                box-shadow: 0 3px 10px rgba(0,0,0,0.35);
                                border: 2.5px solid white;
                            ">
                                <div style="
                                    position: absolute;
                                    top: 50%;
                                    left: 50%;
                                    transform: translate(-50%, -50%) rotate(45deg);
                                    color: white;
                                    font-weight: bold;
                                    font-size: 12px;
                                    font-family: Arial, sans-serif;
                                    text-shadow: 0 1px 2px rgba(0,0,0,0.3);
                                ">${itemIndex + 1}</div>
                            </div>
                        </div>
                    `;

                    const marker = new AMap.Marker({
                        position: lnglat,
                        content: pinContent,
                        offset: new AMap.Pixel(-16, -40), // 调整偏移让尖端对准坐标
                        zIndex: zIndex,
                        cursor: 'pointer',
                        extData: { originalZIndex: zIndex, dayIndex, itemIndex }
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
                                border-radius: 12px;
                                box-shadow: 0 8px 24px rgba(0,0,0,0.2);
                                font-family: system-ui, sans-serif;
                                min-width: 140px;
                                max-width: 240px;
                                border: 1px solid rgba(0,0,0,0.05);
                                transform: translateY(8px);
                            ">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <div style="
                                        width: 36px;
                                        height: 36px;
                                        background: ${isFood ? '#fff7ed' : '#f0fdfa'};
                                        border-radius: 8px;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        font-size: 20px;
                                    ">${item.emoji || (isFood ? '🍽️' : '📍')}</div>
                                    <div>
                                        <div style="font-size: 14px; font-weight: 700; color: #1e293b; line-height: 1.2; margin-bottom: 2px;">
                                            ${item.title}
                                        </div>
                                        <div style="font-size: 11px; color: #64748b; display: flex; align-items: center; gap: 4px;">
                                            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${dayColor};"></span>
                                            Day ${day.day} · ${item.time_label}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;

                        hoverInfoWindowRef.current = new AMap.InfoWindow({
                            content: hoverContent,
                            offset: new AMap.Pixel(0, -42),
                            closeWhenClickMap: true,
                            isCustom: true,
                        });
                        hoverInfoWindowRef.current.open(map, lnglat);

                        // 简单的跳动动画
                        marker.setAnimation('AMAP_ANIMATION_BOUNCE');
                        setTimeout(() => marker.setAnimation('AMAP_ANIMATION_NONE'), 1000);
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

                    // ============================================
                    // Route Logic: Connect prevItem -> currItem
                    // ============================================
                    if (prevItem && prevLngLat) {
                        const distance = calculateDistance(
                            prevItem.location.lat, prevItem.location.lng,
                            item.location.lat, item.location.lng
                        );

                        const isWalking = distance < 2000; // < 2km = Walking
                        const midLat = (prevItem.location.lat + item.location.lat) / 2;
                        const midLng = (prevItem.location.lng + item.location.lng) / 2;

                        // 计算预估时间
                        const estimatedTime = getEstimatedTime(distance, isWalking);
                        const distanceText = distance < 1000
                            ? `${Math.round(distance)}m`
                            : `${(distance / 1000).toFixed(1)}km`;

                        // 1. Draw Line - 线条在标记下层，视觉上穿过标记
                        const polyline = new AMap.Polyline({
                            path: [prevLngLat, lnglat],
                            strokeColor: dayColor,
                            strokeWeight: isWalking ? 4 : 6,
                            strokeOpacity: isWalking ? 0.7 : 0.85,
                            isOutline: true,
                            outlineColor: 'white',
                            borderWeight: isWalking ? 1 : 2,
                            strokeStyle: isWalking ? 'dashed' : 'solid',
                            strokeDasharray: isWalking ? [8, 6] : undefined,
                            lineJoin: 'round',
                            lineCap: 'round',
                            showDir: !isWalking, // 驾车显示方向箭头
                            zIndex: 10, // 低于标记(100+)，让标记覆盖在线上
                        });
                        map.add(polyline);
                        dayPolylines.push(polyline);

                        // 2. Draw Transport Icon at Midpoint - 简洁的设计
                        const transportIconContent = `<div style="display:inline-flex;flex-direction:column;align-items:center;gap:2px;"><div style="background:white;padding:4px 6px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.2);border:2px solid ${dayColor};font-size:14px;">${isWalking ? '🚶' : '🚗'}</div><div style="background:${dayColor};color:white;padding:2px 6px;border-radius:8px;font-size:9px;font-weight:600;white-space:nowrap;">约${estimatedTime}</div></div>`;
                        const midMarker = new AMap.Marker({
                            position: new AMap.LngLat(midLng, midLat),
                            content: transportIconContent,
                            offset: new AMap.Pixel(-20, -25),
                            zIndex: 20,
                        });
                        map.add(midMarker);
                        dayPolylines.push(midMarker);
                    }

                    prevItem = item;
                    prevLngLat = lnglat;
                });

                markersRef.current.push(dayMarkers);
                polylinesRef.current.push(dayPolylines); // 按天存储路线
            });

            if (allMarkers.length > 0) {
                const { amap: padding } = getFitPadding();
                map.setFitView(allMarkers, true, padding);
            }

            // 应用初始筛选
            if (selectedDay !== null) {
                updateVisibility(selectedDay);
            }
        }, [timeline, onMarkerClick, selectedDay, updateVisibility, showItemDetailOnMap, provider, calculateDistance, getEstimatedTime, getFitPadding]);

        // 跟踪上一个激活的 marker
        const lastActiveMarkerRef = useRef<{ dayIndex: number, itemIndex: number } | null>(null);

        // Updated Helper: Set Active Marker - 精确2次跳动
        const setActiveMarkerImpl = useCallback((dayIndex: number, itemIndex: number) => {
            const map = mapInstance.current;
            if (!map) {
                console.warn('[Map] Map not ready');
                return;
            }
            const marker = markersRef.current[dayIndex]?.[itemIndex];
            if (!marker) {
                console.warn('[Map] Marker not found:', { dayIndex, itemIndex });
                return;
            }
            lastActiveMarkerRef.current = { dayIndex, itemIndex };

            if (provider === 'mapbox') {
                const item = timeline[dayIndex]?.items[itemIndex];
                if (!item) return;
                map.flyTo({ center: [item.location.lng, item.location.lat], zoom: 16, speed: 0.8 });
                const el = marker.getElement?.();
                const target = el?.firstElementChild as HTMLElement | null;
                if (target) {
                    target.style.transition = 'transform 0.18s ease';
                    target.style.transform = 'translateZ(0) scale(1.18)';
                    setTimeout(() => { target.style.transform = 'translateZ(0) scale(1)'; }, 180);
                    setTimeout(() => {
                        target.style.transform = 'translateZ(0) scale(1.18)';
                        setTimeout(() => { target.style.transform = 'translateZ(0) scale(1)'; }, 180);
                    }, 220);
                }
                return;
            }

            const AMap = AMapRef.current;
            if (!AMap) {
                console.warn('[Map] AMap not ready');
                return;
            }

            // 恢复上一个激活 marker 的 zIndex
            if (lastActiveMarkerRef.current) {
                const { dayIndex: prevDay, itemIndex: prevItem } = lastActiveMarkerRef.current;
                const prevMarker = markersRef.current[prevDay]?.[prevItem];
                if (prevMarker && typeof prevMarker.setZIndex === 'function') {
                    const prevOriginalZIndex = prevMarker.getExtData?.()?.originalZIndex || 100;
                    prevMarker.setZIndex(prevOriginalZIndex);
                }
            }

            if (typeof marker.getPosition !== 'function') {
                console.warn('[Map] Invalid marker object');
                return;
            }
            const position = marker.getPosition();
            map.setZoomAndCenter(16, position, false, 500);
            if (typeof marker.setZIndex === 'function') {
                marker.setZIndex(9999);
            }
            if (typeof marker.setAnimation === 'function') {
                marker.setAnimation('AMAP_ANIMATION_NONE');
                setTimeout(() => {
                    marker.setAnimation('AMAP_ANIMATION_BOUNCE');
                    setTimeout(() => {
                        marker.setAnimation('AMAP_ANIMATION_NONE');
                    }, 1500);
                }, 550);
            }
        }, [provider, timeline]);

        // 暴露方法
        const methods: MapContainerNewRef = {
            panToSpot: (dayIndex: number, itemIndex: number) => {
                const map = mapInstance.current;
                if (!map) return;
                if (provider === 'mapbox') {
                    const item = timeline[dayIndex]?.items[itemIndex];
                    if (!item) return;
                    map.flyTo({ center: [item.location.lng, item.location.lat], zoom: 15 });
                } else {
                    if (!markersRef.current[dayIndex]?.[itemIndex]) return;
                    const marker = markersRef.current[dayIndex][itemIndex];
                    map.panTo(marker.getPosition());
                }
            },
            highlightSpot: (dayIndex: number, itemIndex: number) => {
                const marker = markersRef.current[dayIndex]?.[itemIndex];
                if (!marker) return;
                if (provider === 'mapbox') {
                    const el = marker.getElement?.();
                    const target = el?.firstElementChild as HTMLElement | null;
                    if (!target) return;
                    target.style.transition = 'transform 0.2s ease';
                    target.style.transform = 'translateZ(0) scale(1.15)';
                    setTimeout(() => {
                        target.style.transform = 'translateZ(0) scale(1)';
                    }, 600);
                } else {
                    marker.setAnimation('AMAP_ANIMATION_BOUNCE');
                    setTimeout(() => marker.setAnimation('AMAP_ANIMATION_NONE'), 1500);
                }
            },
            clearHighlight: () => { },
            setActiveMarker: (dayIndex: number, itemIndex: number) => {
                setActiveMarkerImpl(dayIndex, itemIndex);
            },
            resize: () => {
                if (mapInstance.current) {
                    setTimeout(() => mapInstance.current.resize(), 100);
                }
            },
            showAllDays: () => {
                const map = mapInstance.current;
                if (!map) return;
                if (provider === 'mapbox') {
                    const { mapbox: padding } = getFitPadding();
                    const coords: [number, number][] = [];
                    timeline.forEach(day => day.items.forEach(item => {
                        if (item?.location && (item.location.lng !== 0 || item.location.lat !== 0)) {
                            coords.push([item.location.lng, item.location.lat]);
                        }
                    }));
                    if (coords.length > 0) {
                        const bounds = new mapboxRef.current.LngLatBounds(coords[0], coords[0]);
                        for (const c of coords) bounds.extend(c);
                        map.fitBounds(bounds, { padding, duration: 0, maxZoom: 16 });
                    }
                    // 显示全部
                    markersRef.current.forEach(dayMarkers => dayMarkers.forEach((mk: any) => {
                        const el = mk.getElement?.(); if (el) el.style.display = '';
                    }));
                    mapboxExtrasRef.current.forEach(dayMarkers => dayMarkers?.forEach((mk: any) => {
                        const el = mk.getElement?.(); if (el) el.style.display = '';
                    }));
                    polylinesRef.current.forEach(dayLayers => {
                        if (!dayLayers) return;
                        dayLayers.forEach((item: any) => {
                            try { map.setLayoutProperty(item.layerId, 'visibility', 'visible'); } catch {}
                        });
                    });
                } else {
                    updateVisibility(null);
                    const allMarkers = markersRef.current.flat();
                    if (allMarkers.length > 0) {
                        const { amap: padding } = getFitPadding();
                        map.setFitView(allMarkers, true, padding);
                    }
                }
            },
            showDay: (dayIndex: number) => {
                const map = mapInstance.current;
                if (!map) return;
                if (provider === 'mapbox') {
                    const { mapbox: padding } = getFitPadding();
                    // 仅显示该天
                    markersRef.current.forEach((dayMarkers, idx) => {
                        dayMarkers.forEach((mk: any) => {
                            const el = mk.getElement?.();
                            if (!el) return;
                            el.style.display = (idx === dayIndex) ? '' : 'none';
                        });
                    });
                    mapboxExtrasRef.current.forEach((dayMarkers, idx) => {
                        dayMarkers?.forEach((mk: any) => {
                            const el = mk.getElement?.();
                            if (!el) return;
                            el.style.display = (idx === dayIndex) ? '' : 'none';
                        });
                    });
                    polylinesRef.current.forEach((dayLayers, idx) => {
                        if (!dayLayers) return;
                        dayLayers.forEach((item: any) => {
                            try { map.setLayoutProperty(item.layerId, 'visibility', (idx === dayIndex) ? 'visible' : 'none'); } catch {}
                        });
                    });
                    const coords: [number, number][] = [];
                    (timeline[dayIndex]?.items || []).forEach(i => {
                        if (i?.location && (i.location.lng !== 0 || i.location.lat !== 0)) {
                            coords.push([i.location.lng, i.location.lat]);
                        }
                    });
                    if (coords.length > 0) {
                        const bounds = new mapboxRef.current.LngLatBounds(coords[0], coords[0]);
                        for (const c of coords) bounds.extend(c);
                        map.fitBounds(bounds, { padding, duration: 0, maxZoom: 16 });
                    }
                } else {
                    updateVisibility(dayIndex);
                    const dayMarkers = markersRef.current[dayIndex];
                    if (dayMarkers && dayMarkers.length > 0) {
                        const { amap: padding } = getFitPadding();
                        map.setFitView(dayMarkers, true, padding);
                    }
                }
            },
            showItemDetail: (dayIndex: number, itemIndex: number) => {
                showItemDetailOnMap(dayIndex, itemIndex);
            },
        };

        useImperativeHandle(ref, () => methods);

        // 当地图就绪时调用 onReady 回调
        useEffect(() => {
            if (mapReady && onReady) {
                console.log('[MapContainerNew] Calling onReady callback');
                onReady(methods);
            }
        }, [mapReady, onReady]);


        useEffect(() => {
            let isMounted = true

            setMapReady(false);
            setIsLoading(true);
            setError(null);
            markersRef.current = [];
            polylinesRef.current = [];
            mapboxExtrasRef.current = [];
            if (hoverInfoWindowRef.current) {
                hoverInfoWindowRef.current.close?.();
                hoverInfoWindowRef.current = null;
            }
            if (detailInfoWindowRef.current) {
                detailInfoWindowRef.current.close?.();
                detailInfoWindowRef.current = null;
            }
            if (mapboxHoverPopupRef.current) {
                try { mapboxHoverPopupRef.current.remove?.(); } catch { }
                mapboxHoverPopupRef.current = null;
            }
            if (mapInstance.current) {
                try {
                    if (provider === 'mapbox') {
                        mapInstance.current.remove?.();
                    } else {
                        mapInstance.current.destroy?.();
                    }
                } catch {}
                mapInstance.current = null;
            }
            isInitializedRef.current = false;

            const initMap = async () => {
                try {
                    if (provider === 'mapbox') {
                        const mapboxgl = (await import('mapbox-gl')).default;
                        mapboxRef.current = mapboxgl;
                        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
                        if (!token) {
                            throw new Error('缺少 Mapbox Token');
                        }
                        mapboxgl.accessToken = token;
                        if (!isMounted || !mapContainerRef.current) return;

                        let initialCenter: [number, number] = [118.089, 24.479];
                        let hasInitial = false;
                        for (const day of timeline || []) {
                            for (const item of day.items || []) {
                                if (item?.location && (item.location.lng !== 0 || item.location.lat !== 0)) {
                                    initialCenter = [item.location.lng, item.location.lat];
                                    hasInitial = true;
                                    break;
                                }
                            }
                            if (hasInitial) break;
                        }

                        const map = new mapboxgl.Map({
                            container: mapContainerRef.current,
                            style: 'mapbox://styles/mapbox/streets-v12',
                            center: initialCenter,
                            zoom: 12
                        });
                        map.addControl(new mapboxgl.NavigationControl(), 'top-right');
                        map.on('load', () => {
                            if (isMounted) {
                                setIsLoading(false);
                                setMapReady(true);
                            }
                        });
                        mapInstance.current = map;
                    } else {
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

                        let initialCenter: [number, number] = [118.089, 24.479];
                        let found = false;
                        for (const day of timeline || []) {
                            for (const item of day.items || []) {
                                if (item?.location && (item.location.lng !== 0 || item.location.lat !== 0)) {
                                    initialCenter = [item.location.lng, item.location.lat];
                                    found = true;
                                    break;
                                }
                            }
                            if (found) break;
                        }

                        const map = new AMap.Map(mapContainerRef.current, {
                            zoom: 12,
                            center: initialCenter,
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
                    }
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
                    try {
                        if (provider === 'mapbox') {
                            mapInstance.current.remove?.();
                        } else {
                            mapInstance.current.destroy?.();
                        }
                    } catch {}
                    mapInstance.current = null;
                }
                isInitializedRef.current = false;
            };
        }, [provider]);

        // 地图准备好后绘制
        useEffect(() => {
            if (mapReady && timeline && timeline.length > 0) {
                drawMarkersAndRoutes();
            }
        }, [mapReady, timeline, drawMarkersAndRoutes]);

        // 监听 selectedDay 变化更新可见性
        useEffect(() => {
            if (!mapReady || !isInitializedRef.current) return;
            if (provider === 'mapbox') {
                if (mapboxHoverPopupRef.current) {
                    try { mapboxHoverPopupRef.current.remove?.(); } catch { }
                    mapboxHoverPopupRef.current = null;
                }
                markersRef.current.forEach((dayMarkers, dayIndex) => {
                    dayMarkers.forEach((mk: any) => {
                        const el = mk.getElement?.();
                        if (!el) return;
                        if (selectedDay === null || selectedDay === dayIndex) {
                            el.style.display = '';
                        } else {
                            el.style.display = 'none';
                        }
                    });
                });
                mapboxExtrasRef.current.forEach((extras, dayIndex) => {
                    if (!extras) return;
                    extras.forEach((mk: any) => {
                        const el = mk.getElement?.();
                        if (!el) return;
                        if (selectedDay === null || selectedDay === dayIndex) {
                            el.style.display = '';
                        } else {
                            el.style.display = 'none';
                        }
                    });
                });
                polylinesRef.current.forEach((dayLayers, dayIndex) => {
                    if (!dayLayers) return;
                    dayLayers.forEach((item: any) => {
                        const layerId = item.layerId;
                        if (!layerId) return;
                        const visibility = (selectedDay === null || selectedDay === dayIndex) ? 'visible' : 'none';
                        try {
                            mapInstance.current.setLayoutProperty(layerId, 'visibility', visibility);
                        } catch {}
                    });
                });

                const map = mapInstance.current;
                if (map) {
                    const { mapbox: padding } = getFitPadding();
                    const coords: [number, number][] = [];
                    if (selectedDay === null) {
                        timeline.forEach(day => day.items.forEach(item => {
                            if (item?.location && (item.location.lng !== 0 || item.location.lat !== 0)) {
                                coords.push([item.location.lng, item.location.lat]);
                            }
                        }));
                    } else {
                        timeline[selectedDay]?.items.forEach(item => {
                            if (item?.location && (item.location.lng !== 0 || item.location.lat !== 0)) {
                                coords.push([item.location.lng, item.location.lat]);
                            }
                        });
                    }
                    if (coords.length > 0) {
                        const bounds = new mapboxRef.current.LngLatBounds(coords[0], coords[0]);
                        for (const c of coords) bounds.extend(c);
                        map.fitBounds(bounds, { padding, duration: 0, maxZoom: 16 });
                    }
                }
            } else {
                if (hoverInfoWindowRef.current) {
                    hoverInfoWindowRef.current.close?.();
                    hoverInfoWindowRef.current = null;
                }
                updateVisibility(selectedDay);
                const map = mapInstance.current;
                const AMap = AMapRef.current;
                if (map && AMap) {
                    const { amap: padding } = getFitPadding();
                    if (selectedDay === null) {
                        const allMarkers = markersRef.current.flat();
                        if (allMarkers.length > 0) {
                            map.setFitView(allMarkers, true, padding);
                        }
                    } else {
                        const dayMarkers = markersRef.current[selectedDay];
                        if (dayMarkers && dayMarkers.length > 0) {
                            map.setFitView(dayMarkers, true, padding);
                        }
                    }
                }
            }
        }, [selectedDay, mapReady, updateVisibility, provider, timeline, getFitPadding]);

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
                    <div className="absolute bottom-24 left-4 bg-white/95 backdrop-blur-md rounded-lg p-3 shadow-lg border border-slate-200 z-10 max-w-[200px]">
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
