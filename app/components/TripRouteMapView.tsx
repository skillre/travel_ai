import React from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { TripPlan, TripPlanItem } from '../types';

interface TripRouteMapViewProps {
    tripPlan: TripPlan;
    className?: string;
    id?: string; // ID for html2canvas
}

// Day color configuration
const dayColors = {
    markers: [
        { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-blue-600', lightBg: 'bg-blue-50' },
        { bg: 'bg-orange-500', border: 'border-orange-600', text: 'text-orange-600', lightBg: 'bg-orange-50' },
        { bg: 'bg-emerald-500', border: 'border-emerald-600', text: 'text-emerald-600', lightBg: 'bg-emerald-50' },
        { bg: 'bg-violet-500', border: 'border-violet-600', text: 'text-violet-600', lightBg: 'bg-violet-50' },
        { bg: 'bg-pink-500', border: 'border-pink-600', text: 'text-pink-600', lightBg: 'bg-pink-50' },
        { bg: 'bg-cyan-500', border: 'border-cyan-600', text: 'text-cyan-600', lightBg: 'bg-cyan-50' },
        { bg: 'bg-yellow-500', border: 'border-yellow-600', text: 'text-yellow-600', lightBg: 'bg-yellow-50' },
    ]
};

// --- Map Projection Utilities ---

// Constants for Web Mercator projection
const TILE_SIZE = 256;

function latLngToPoint(lat: number, lng: number, zoom: number) {
    const scale = Math.pow(2, zoom);
    const worldSize = TILE_SIZE * scale;

    const x = ((lng + 180) / 360) * worldSize;

    // Project latitude using Mercator projection formula
    const siny = Math.min(Math.max(Math.sin((lat * Math.PI) / 180), -0.9999), 0.9999);
    const y = (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI)) * worldSize;

    return { x, y };
}

interface Bounds {
    minLng: number;
    maxLng: number;
    minLat: number;
    maxLat: number;
}

function getBounds(items: TripPlanItem[]): Bounds | null {
    if (items.length === 0) return null;

    // Filter out items with 0,0 coordinates
    const validItems = items.filter(item => item.location && (item.location.lng !== 0 || item.location.lat !== 0));
    if (validItems.length === 0) return null;

    let minLng = 180;
    let maxLng = -180;
    let minLat = 90;
    let maxLat = -90;

    validItems.forEach(item => {
        minLng = Math.min(minLng, item.location.lng);
        maxLng = Math.max(maxLng, item.location.lng);
        minLat = Math.min(minLat, item.location.lat);
        maxLat = Math.max(maxLat, item.location.lat);
    });

    return { minLng, maxLng, minLat, maxLat };
}

function getCenter(bounds: Bounds): { lng: number, lat: number } {
    return {
        lng: (bounds.minLng + bounds.maxLng) / 2,
        lat: (bounds.minLat + bounds.maxLat) / 2
    };
}

function getZoom(bounds: Bounds, width: number, height: number): number {
    const WORLD_DIM = { height: 256, width: 256 };
    const ZOOM_MAX = 17;
    const ZOOM_MIN = 3;
    const PADDING = 100; // Pixels padding

    function latRad(lat: number) {
        const sin = Math.sin(lat * Math.PI / 180);
        const radX2 = Math.log((1 + sin) / (1 - sin)) / 2;
        return Math.max(Math.min(radX2, Math.PI), -Math.PI) / 2;
    }

    function zoom(mapPx: number, worldPx: number, fraction: number) {
        return Math.floor(Math.log(mapPx / worldPx / fraction) / Math.LN2);
    }

    const latFraction = (latRad(bounds.maxLat) - latRad(bounds.minLat)) / Math.PI;
    const lngDiff = bounds.maxLng - bounds.minLng;
    const lngFraction = ((lngDiff < 0) ? (lngDiff + 360) : lngDiff) / 360;

    const latZoom = zoom(height - PADDING * 2, WORLD_DIM.height, latFraction);
    const lngZoom = zoom(width - PADDING * 2, WORLD_DIM.width, lngFraction);

    return Math.min(latZoom, lngZoom, ZOOM_MAX);
}

// -------------------------------

export default function TripRouteMapView({ tripPlan, className = '', id }: TripRouteMapViewProps) {
    const containerWidth = 1600; // Wide landscape (16:9)
    const containerHeight = 900;
    const amapKey = process.env.NEXT_PUBLIC_AMAP_KEY;

    const allSpots: { item: TripPlanItem, dayIndex: number, index: number, globalIndex: number }[] = [];
    let globalIndex = 0;

    tripPlan.timeline.forEach((day, dayIndex) => {
        day.items.forEach((item, index) => {
            if ((item.type === 'spot' || item.type === 'food') &&
                item.location && (item.location.lat !== 0 || item.location.lng !== 0)) {
                allSpots.push({ item, dayIndex, index, globalIndex: globalIndex++ });
            }
        });
    });

    const bounds = getBounds(allSpots.map(s => s.item));
    let mapParams = null;
    let markers: any[] = [];

    // Group by day to draw day-colored paths
    // Define type for markers
    type MarkerType = {
        x: number;
        y: number;
        item: TripPlanItem;
        dayIndex: number;
        index: number;
        globalIndex: number;
    };
    const markersByDay: { [key: number]: MarkerType[] } = {};

    let staticMapUrl = '';

    if (bounds && allSpots.length > 0 && amapKey) {
        const zoom = getZoom(bounds, containerWidth, containerHeight);
        const center = getCenter(bounds);

        // Calculate center point in pixels to offset markers
        const centerPoint = latLngToPoint(center.lat, center.lng, zoom);
        const centerXOffset = containerWidth / 2;
        const centerYOffset = containerHeight / 2;

        mapParams = { bounds, zoom, center, centerPoint };

        staticMapUrl = `https://restapi.amap.com/v3/staticmap?location=${center.lng.toFixed(6)},${center.lat.toFixed(6)}&zoom=${zoom}&size=1024*576&scale=2&key=${amapKey}`;

        markers = allSpots.map(spot => {
            const point = latLngToPoint(spot.item.location.lat, spot.item.location.lng, zoom);
            return {
                ...spot,
                x: point.x - centerPoint.x + centerXOffset,
                y: point.y - centerPoint.y + centerYOffset,
            };
        });

        markers.forEach(m => {
            if (!markersByDay[m.dayIndex]) markersByDay[m.dayIndex] = [];
            markersByDay[m.dayIndex].push(m);
        });
    }

    const totalDays = tripPlan.timeline.length;

    return (
        <div
            id={id}
            data-export-container="true"
            className={`relative overflow-hidden ${className}`}
            style={{
                width: `${containerWidth}px`,
                height: `${containerHeight}px`,
                backgroundColor: '#f1f5f9',
                borderRadius: '16px',
            }}
        >
            {/* Level 0: Static Map Background with Filters */}
            {staticMapUrl ? (
                <div className="absolute inset-0 z-0">
                    <img
                        src={staticMapUrl}
                        alt="Route Map"
                        className="w-full h-full object-cover"
                        style={{
                            filter: 'grayscale(100%) brightness(115%) contrast(90%) sepia(5%)',
                            opacity: 0.9,
                        }}
                    />
                </div>
            ) : (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                    No location data available
                </div>
            )}

            {/* Header Section */}
            <div className="absolute top-0 left-0 right-0 p-5 z-30 pointer-events-none">
                <div className="text-center">
                    <div className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-slate-200">
                        <MapPin className="w-4 h-4 text-rose-500" />
                        <h2 className="text-lg font-bold text-slate-800">{tripPlan.meta.city}</h2>
                        <span className="text-slate-400 text-sm">|</span>
                        <span className="text-sm text-slate-600">{totalDays}日路线图</span>
                    </div>
                </div>
                <h3 className="text-center text-sm text-slate-500 mt-2 line-clamp-1 px-4 drop-shadow-sm bg-white/50 inline-block rounded-md mx-auto">
                    {tripPlan.meta.trip_title}
                </h3>
            </div>

            {/* Day Zone Labels - Left Side */}
            <div className="absolute left-0 top-[100px] bottom-[60px] w-[40px] flex flex-col z-20 pointer-events-none">
                {tripPlan.timeline.map((day, dayIndex) => {
                    const colors = dayColors.markers[dayIndex % dayColors.markers.length];
                    const height = `${100 / totalDays}%`;
                    return (
                        <div key={day.day} className="flex items-center justify-center" style={{ height }}>
                            <div className={`flex flex-col items-center justify-center w-8 h-14 rounded-lg bg-white/90 shadow-sm border ${colors.border} border-opacity-30`}>
                                <span className={`text-[10px] font-medium ${colors.text} opacity-60`}>DAY</span>
                                <span className={`text-lg font-bold ${colors.text}`}>{day.day}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Level 1: SVG Route Lines */}
            <svg
                className="absolute inset-0 z-10 pointer-events-none"
                style={{ width: containerWidth, height: containerHeight }}
                viewBox={`0 0 ${containerWidth} ${containerHeight}`}
                xmlns="http://www.w3.org/2000/svg"
            >
                {tripPlan.timeline.map((day, dayIndex) => {
                    const dayMarkerIndices = markers.filter(m => m.dayIndex === dayIndex);
                    if (dayMarkerIndices.length < 2) return null;

                    let d = `M ${dayMarkerIndices[0].x} ${dayMarkerIndices[0].y}`;
                    for (let i = 1; i < dayMarkerIndices.length; i++) {
                        d += ` L ${dayMarkerIndices[i].x} ${dayMarkerIndices[i].y}`;
                    }

                    const colors = dayColors.markers[dayIndex % dayColors.markers.length];
                    const strokeColor = dayIndex === 0 ? '#ff4d4f' : // Bright Red for Day 1
                        dayIndex === 1 ? '#fa8c16' : // Orange Day 2
                            dayIndex === 2 ? '#52c41a' : // Green Day 3
                                '#1677ff'; // Blue others

                    return (
                        <path
                            key={day.day}
                            d={d}
                            fill="none"
                            stroke={strokeColor}
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeDasharray="8 4"
                            opacity="0.9"
                            filter="drop-shadow(0px 1px 1px rgba(255,255,255,0.8))"
                        />
                    );
                })}
            </svg>

            {/* Level 2: Markers */}
            <div className="absolute inset-0 z-20 pointer-events-none">
                {markers.map((node) => {
                    const colors = dayColors.markers[node.dayIndex % dayColors.markers.length];

                    return (
                        <div
                            key={`${node.dayIndex}-${node.index}`}
                            className="absolute flex items-center"
                            style={{
                                left: `${node.x}px`,
                                top: `${node.y}px`,
                                transform: 'translate(-50%, -50%)', // Center the marker on the point
                            }}
                        >
                            {/* Number Badge */}
                            <div
                                className={`flex items-center justify-center w-8 h-8 rounded-full ${colors.bg} text-white font-bold text-sm shadow-lg border-2 border-white z-20`}
                                style={{
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                                }}
                            >
                                {node.globalIndex + 1}
                            </div>

                            {/* Location Name Bubble */}
                            <div
                                className="absolute left-[50%] top-[-36px] -translate-x-1/2 px-3 py-1.5 bg-white/95 rounded-lg shadow-md border border-slate-200 whitespace-nowrap z-30"
                                style={{
                                    transform: 'translate(-50%, 0)', // Centered above
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                }}
                            >
                                <div className="flex items-center gap-1">
                                    <span className="text-base">{node.item.emoji}</span>
                                    <span className="text-xs font-bold text-slate-800">
                                        {node.item.title}
                                    </span>
                                </div>
                                {/* Tiny triangle arrow */}
                                <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-white/95" />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer / Legend */}
            <div className="absolute bottom-0 left-0 right-0 p-4 z-30 bg-gradient-to-t from-white/90 to-transparent">
                <div className="flex items-center justify-center gap-4 flex-wrap">
                    {tripPlan.timeline.map((day, idx) => {
                        const colors = dayColors.markers[idx % dayColors.markers.length];
                        const spots = day.items.filter(i => i.type === 'spot' || i.type === 'food');
                        if (spots.length === 0) return null;

                        return (
                            <div key={day.day} className="flex items-center gap-1.5 bg-white/80 px-2 py-1 rounded-full shadow-sm border border-slate-100">
                                <div className={`w-3 h-3 rounded-full ${colors.bg}`}></div>
                                <span className="text-xs text-slate-600 font-medium">
                                    Day {day.day}
                                </span>
                            </div>
                        );
                    })}
                </div>

                <div className="text-center mt-2">
                    <span className="text-[10px] text-slate-400 font-medium tracking-wide">
                        POWERED BY AMAP • AI TRAVEL PLANNER
                    </span>
                </div>
            </div>

            {/* Compass Decoration */}
            <div className="absolute top-[80px] right-5 w-12 h-12 opacity-60 z-10 p-2 bg-white/50 rounded-full backdrop-blur-sm border border-white/20">
                <Navigation className="w-full h-full text-slate-600" />
            </div>
        </div>
    );
}
