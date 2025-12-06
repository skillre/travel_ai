'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
    interface Window {
        AMap: any;
    }
}

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
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initMap = async () => {
            try {
                const AMapLoader = (await import('@amap/amap-jsapi-loader')).default;

                const AMap = await AMapLoader.load({
                    key: process.env.NEXT_PUBLIC_AMAP_KEY || '',
                    version: '2.0',
                    plugins: ['AMap.Scale', 'AMap.ToolBar'],
                });

                if (!mapRef.current) return;

                const map = new AMap.Map(mapRef.current, {
                    zoom: 12,
                    center: [118.089, 24.479], // 默认厦门
                    mapStyle: 'amap://styles/whitesmoke',
                });

                mapInstance.current = map;
                setIsLoading(false);

                // 添加控件
                map.addControl(new AMap.Scale());
                map.addControl(new AMap.ToolBar({ position: 'RB' }));

            } catch (err) {
                console.error('Map init error:', err);
                setError('地图加载失败');
                setIsLoading(false);
            }
        };

        initMap();

        return () => {
            if (mapInstance.current) {
                mapInstance.current.destroy();
            }
        };
    }, []);

    // 当 dailyPlan 更新时，重新绘制标记和路线
    useEffect(() => {
        if (!mapInstance.current || !dailyPlan || dailyPlan.length === 0) return;

        const map = mapInstance.current;
        const AMap = window.AMap;

        // 清除所有覆盖物
        map.clearMap();

        const allMarkers: any[] = [];

        dailyPlan.forEach((day, dayIndex) => {
            const color = dayColors[dayIndex % dayColors.length];
            const pathPoints: [number, number][] = [];

            day.routes.forEach((route, routeIndex) => {
                const position: [number, number] = [route.longitude, route.latitude];
                pathPoints.push(position);

                // 创建自定义标记
                const markerContent = `
          <div style="
            position: relative;
            width: 36px;
            height: 36px;
          ">
            <div style="
              width: 36px;
              height: 36px;
              background: ${color};
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              border: 3px solid white;
            ">
              <span style="
                transform: rotate(45deg);
                color: white;
                font-weight: bold;
                font-size: 14px;
              ">${routeIndex + 1}</span>
            </div>
          </div>
        `;

                const marker = new AMap.Marker({
                    position: position,
                    content: markerContent,
                    offset: new AMap.Pixel(-18, -36),
                    title: route.name,
                });

                // 添加信息窗口
                const infoWindow = new AMap.InfoWindow({
                    content: `
            <div style="padding: 12px; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; color: ${color}; font-size: 16px;">
                Day ${day.day} - ${route.name}
              </h3>
              <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.5;">
                ${route.desc}
              </p>
            </div>
          `,
                    offset: new AMap.Pixel(0, -40),
                });

                marker.on('click', () => {
                    infoWindow.open(map, position);
                });

                map.add(marker);
                allMarkers.push(marker);
            });

            // 绘制当天路线
            if (pathPoints.length > 1) {
                const polyline = new AMap.Polyline({
                    path: pathPoints,
                    strokeColor: color,
                    strokeWeight: 4,
                    strokeOpacity: 0.8,
                    strokeStyle: 'solid',
                    lineJoin: 'round',
                    lineCap: 'round',
                });
                map.add(polyline);
            }
        });

        // 自动调整视野
        if (allMarkers.length > 0) {
            map.setFitView(allMarkers, false, [60, 60, 60, 60]);
        }
    }, [dailyPlan]);

    return (
        <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl">
            <div ref={mapRef} className="w-full h-full" />

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
                    <div className="text-center">
                        <p className="text-red-500 text-lg mb-2">😔 {error}</p>
                        <p className="text-red-400 text-sm">请检查网络连接后刷新页面</p>
                    </div>
                </div>
            )}

            {/* 图例 */}
            {dailyPlan.length > 0 && (
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-lg">
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
