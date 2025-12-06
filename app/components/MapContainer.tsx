'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface Route {
    name: string;
    desc: string;
    latitude: number;
    longitude: number;
}

interface DailyPlan {
    day: number;
    routes: Route[];
}

interface MapContainerProps {
    dailyPlan: DailyPlan[];
}

// 每天路线的颜色
const dayColors = [
    '#FF6B6B', // Day 1 - 红色
    '#4ECDC4', // Day 2 - 青色
    '#45B7D1', // Day 3 - 蓝色
    '#96CEB4', // Day 4 - 绿色
    '#FFEAA7', // Day 5 - 黄色
    '#DDA0DD', // Day 6 - 紫色
    '#98D8C8', // Day 7 - 薄荷绿
];

export default function MapContainer({ dailyPlan }: MapContainerProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const AMapRef = useRef<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mapReady, setMapReady] = useState(false);

    // 初始化地图
    useEffect(() => {
        let isMounted = true;

        const initMap = async () => {
            try {
                // 动态导入高德地图加载器
                const AMapLoader = (await import('@amap/amap-jsapi-loader')).default;

                const amapKey = process.env.NEXT_PUBLIC_AMAP_KEY;
                if (!amapKey) {
                    throw new Error('缺少高德地图 API Key');
                }

                // 使用 1.4.15 版本更稳定
                const AMap = await AMapLoader.load({
                    key: amapKey,
                    version: '1.4.15',
                    plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.InfoWindow'],
                });

                if (!isMounted || !mapRef.current) return;

                AMapRef.current = AMap;

                // 创建地图实例
                const map = new AMap.Map(mapRef.current, {
                    zoom: 12,
                    center: [118.089, 24.479], // 默认厦门
                    resizeEnable: true,
                });

                mapInstance.current = map;

                // 地图加载完成
                map.on('complete', () => {
                    if (isMounted) {
                        setIsLoading(false);
                        setMapReady(true);
                    }
                });

                // 添加控件
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

        // 清除所有覆盖物
        map.clearMap();

        const allMarkers: any[] = [];

        dailyPlan.forEach((day, dayIndex) => {
            const color = dayColors[dayIndex % dayColors.length];
            const pathPoints: any[] = [];

            day.routes.forEach((route, routeIndex) => {
                const lnglat = new AMap.LngLat(route.longitude, route.latitude);
                pathPoints.push(lnglat);

                // 创建标记
                const marker = new AMap.Marker({
                    position: lnglat,
                    title: route.name,
                    label: {
                        content: `<div style="
              background: ${color};
              color: white;
              padding: 4px 8px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: bold;
              white-space: nowrap;
              box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            ">D${day.day}-${routeIndex + 1}</div>`,
                        direction: 'top',
                        offset: new AMap.Pixel(0, -5),
                    },
                });

                // 创建信息窗口内容
                const infoContent = `
          <div style="padding: 12px; min-width: 200px; max-width: 280px;">
            <h3 style="margin: 0 0 8px 0; color: ${color}; font-size: 16px; font-weight: bold;">
              Day ${day.day} - ${route.name}
            </h3>
            <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.5;">
              ${route.desc}
            </p>
          </div>
        `;

                // 点击标记显示信息窗口
                marker.on('click', () => {
                    const infoWindow = new AMap.InfoWindow({
                        content: infoContent,
                        offset: new AMap.Pixel(0, -30),
                    });
                    infoWindow.open(map, lnglat);
                });

                map.add(marker);
                allMarkers.push(marker);
            });

            // 绘制当天路线
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

        // 自动调整视野
        if (allMarkers.length > 0) {
            map.setFitView(allMarkers, false, [80, 80, 80, 80]);
        }
    }, [dailyPlan]);

    // 当 dailyPlan 更新且地图就绪时，重新绘制
    useEffect(() => {
        if (mapReady && dailyPlan && dailyPlan.length > 0) {
            drawMarkersAndRoutes();
        }
    }, [mapReady, dailyPlan, drawMarkersAndRoutes]);

    return (
        <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl">
            <div ref={mapRef} className="w-full h-full" style={{ minHeight: '300px' }} />

            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-primary-700 font-medium">地图加载中...</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-50">
                    <div className="text-center p-8">
                        <p className="text-red-500 text-lg mb-2">😔 {error}</p>
                        <p className="text-red-400 text-sm">请检查高德地图 API Key 配置</p>
                    </div>
                </div>
            )}

            {/* 图例 */}
            {dailyPlan && dailyPlan.length > 0 && !isLoading && !error && (
                <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl p-3 shadow-lg z-10">
                    <p className="text-xs text-gray-500 mb-2 font-medium">路线图例</p>
                    <div className="flex flex-wrap gap-2">
                        {dailyPlan.map((day, index) => (
                            <div key={day.day} className="flex items-center gap-1.5">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: dayColors[index % dayColors.length] }}
                                />
                                <span className="text-xs text-gray-600">Day {day.day}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
