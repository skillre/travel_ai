

import React from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { TripPlan, TripPlanItem } from '../types';

interface TripRouteMapViewProps {
    tripPlan: TripPlan;
    className?: string;
    id?: string; // ID for html2canvas
}

// Day color configuration - matching existing color system
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

// Generate positions using S-shaped or Z-shaped layout algorithm
interface NodePosition {
    dayIndex: number;
    itemIndex: number;
    globalIndex: number;
    item: TripPlanItem;
    top: number;
    left: number;
}

const generateNodePositions = (tripPlan: TripPlan): NodePosition[] => {
    const positions: NodePosition[] = [];
    const totalDays = tripPlan.timeline.length;

    // Calculate vertical segments for each day
    const dayHeight = 100 / totalDays; // Percentage height per day

    let globalIndex = 0;

    tripPlan.timeline.forEach((day, dayIndex) => {
        const spots = day.items.filter(item => item.type === 'spot' || item.type === 'food');
        const itemCount = spots.length;

        if (itemCount === 0) return;

        // Vertical base position for this day
        const dayTopBase = dayIndex * dayHeight + 5; // 5% padding from top of day section
        const availableHeight = dayHeight - 10; // 10% padding within day section

        spots.forEach((item, itemIdx) => {
            // S-shaped layout: alternate sides
            const isEven = itemIdx % 2 === 0;

            // Horizontal position: zigzag pattern within day
            // First item starts on left, then alternates
            let left: number;
            if (itemCount === 1) {
                left = 50; // Center if only one item
            } else {
                left = isEven ? 20 + (itemIdx * 5) : 80 - (itemIdx * 5);
                // Keep within bounds
                left = Math.max(15, Math.min(85, left));
            }

            // Vertical position within day section
            const verticalSpacing = itemCount > 1 ? availableHeight / (itemCount - 1) : 0;
            const top = dayTopBase + (itemIdx * verticalSpacing);

            positions.push({
                dayIndex,
                itemIndex: itemIdx,
                globalIndex: globalIndex++,
                item,
                top: Math.max(3, Math.min(95, top)), // Clamp to safe bounds
                left,
            });
        });
    });

    return positions;
};

// Generate SVG path for connecting nodes
const generateConnectorPath = (nodes: NodePosition[], containerWidth: number, containerHeight: number): string => {
    if (nodes.length < 2) return '';

    const points = nodes.map(node => ({
        x: (node.left / 100) * containerWidth,
        y: (node.top / 100) * containerHeight + 16, // Offset to center of marker
    }));

    // Build smooth curve path
    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];

        // Use quadratic bezier for smooth curves
        const midX = (prev.x + curr.x) / 2;
        const midY = (prev.y + curr.y) / 2;

        // Control point for smooth S-curve effect
        const cpX = midX;
        const cpY = prev.y;

        path += ` Q ${cpX} ${cpY} ${midX} ${midY}`;
        path += ` Q ${midX} ${curr.y} ${curr.x} ${curr.y}`;
    }

    return path;
};

export default function TripRouteMapView({ tripPlan, className = '', id }: TripRouteMapViewProps) {
    const containerWidth = 1600; // Wide landscape (16:9)
    const containerHeight = 900;

    const nodes = generateNodePositions(tripPlan);
    const svgPath = generateConnectorPath(nodes, containerWidth, containerHeight);

    const totalDays = tripPlan.timeline.length;

    return (
        <div
            id={id}
            data-export-container="true"
            className={`relative overflow-hidden ${className}`}
            style={{
                width: `${containerWidth}px`,
                height: `${containerHeight}px`,
                backgroundColor: '#f1f5f9', // bg-slate-100
                borderRadius: '16px',
            }}
        >
            {/* Background Decorations - City Silhouette Watermark */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.04]">
                {/* Abstract city skyline pattern - centered and aligned to bottom */}
                <svg className="w-full h-full" viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg">
                    {/* Building silhouettes at bottom - Shifted X+595, Y+820 */}
                    <g fill="#334155">
                        <rect x="595" y="820" width="40" height="80" />
                        <rect x="645" y="780" width="35" height="120" />
                        <rect x="690" y="800" width="50" height="100" />
                        <rect x="750" y="770" width="30" height="130" />
                        <rect x="790" y="790" width="45" height="110" />
                        <rect x="845" y="810" width="35" height="90" />
                        <rect x="890" y="775" width="40" height="125" />
                        <rect x="940" y="795" width="35" height="105" />
                        <rect x="985" y="815" width="25" height="85" />
                    </g>
                    {/* Geometric circles for decoration - Shifted X+125 */}
                    <circle cx="675" cy="150" r="60" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
                    <circle cx="925" cy="250" r="80" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
                    <circle cx="775" cy="400" r="50" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
                </svg>
            </div>

            {/* Header Section */}
            <div className="absolute top-0 left-0 right-0 p-5 z-20">
                <div className="text-center">
                    <div className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-slate-200">
                        <MapPin className="w-4 h-4 text-rose-500" />
                        <h2 className="text-lg font-bold text-slate-800">{tripPlan.meta.city}</h2>
                        <span className="text-slate-400 text-sm">|</span>
                        <span className="text-sm text-slate-600">{totalDays}日路线图</span>
                    </div>
                </div>
                <h3 className="text-center text-sm text-slate-500 mt-2 line-clamp-1 px-4">
                    {tripPlan.meta.trip_title}
                </h3>
            </div>

            {/* Day Zone Labels - Left Side */}
            <div className="absolute left-0 top-[100px] bottom-[60px] w-[40px] flex flex-col z-10">
                {tripPlan.timeline.map((day, dayIndex) => {
                    const colors = dayColors.markers[dayIndex % dayColors.markers.length];
                    const height = `${100 / totalDays}%`;

                    return (
                        <div
                            key={day.day}
                            className="flex items-center justify-center"
                            style={{ height }}
                        >
                            <div
                                className={`flex flex-col items-center justify-center w-8 h-14 rounded-lg ${colors.lightBg} border ${colors.border} border-opacity-30`}
                            >
                                <span className={`text-[10px] font-medium ${colors.text} opacity-60`}>DAY</span>
                                <span className={`text-lg font-bold ${colors.text}`}>{day.day}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* SVG Connector Lines */}
            <svg
                className="absolute inset-0 z-0 pointer-events-none"
                style={{
                    width: containerWidth,
                    height: containerHeight,
                    marginTop: '70px', // Offset for header
                }}
                viewBox={`0 0 ${containerWidth} ${containerHeight}`}
                xmlns="http://www.w3.org/2000/svg"
            >
                {svgPath && (
                    <path
                        d={svgPath}
                        fill="none"
                        stroke="#94a3b8" // slate-400
                        strokeWidth="2"
                        strokeDasharray="6 4"
                        strokeLinecap="round"
                        opacity="0.6"
                    />
                )}

                {/* Directional arrows along path */}
                {nodes.length > 1 && nodes.slice(1).map((node, idx) => {
                    const prev = nodes[idx];
                    const x = (node.left / 100) * containerWidth;
                    const y = (node.top / 100) * containerHeight + 16;
                    const prevX = (prev.left / 100) * containerWidth;
                    const prevY = (prev.top / 100) * containerHeight + 16;

                    // Calculate angle for arrow direction
                    const angle = Math.atan2(y - prevY, x - prevX) * (180 / Math.PI);
                    const midX = (x + prevX) / 2;
                    const midY = (y + prevY) / 2;

                    return (
                        <g key={idx} transform={`translate(${midX}, ${midY}) rotate(${angle})`}>
                            <polygon
                                points="-4,-3 4,0 -4,3"
                                fill="#94a3b8"
                                opacity="0.4"
                            />
                        </g>
                    );
                })}
            </svg>

            {/* Route Nodes (Markers) */}
            <div
                className="absolute z-10"
                style={{
                    left: '40px',
                    right: '0',
                    top: '100px',
                    bottom: '60px',
                }}
            >
                {nodes.map((node) => {
                    const colors = dayColors.markers[node.dayIndex % dayColors.markers.length];

                    // Adjust positions for the inner container
                    const containerInnerWidth = containerWidth - 40; // Subtract left day labels
                    const leftPx = ((node.left - 15) / 70) * containerInnerWidth; // Remap 15-85% to container width

                    const containerInnerHeight = containerHeight - 160; // Subtract header and footer
                    const topPx = (node.top / 100) * containerInnerHeight;

                    return (
                        <div
                            key={`${node.dayIndex}-${node.itemIndex}`}
                            className="absolute flex items-center"
                            style={{
                                left: `${Math.max(0, Math.min(leftPx, containerInnerWidth - 150))}px`,
                                top: `${topPx}px`,
                                transform: 'translateY(-50%)',
                            }}
                        >
                            {/* Number Badge */}
                            <div
                                className={`flex items-center justify-center w-8 h-8 rounded-full ${colors.bg} text-white font-bold text-sm shadow-lg border-2 border-white z-20`}
                                style={{
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                }}
                            >
                                {node.globalIndex + 1}
                            </div>

                            {/* Location Name Bubble */}
                            <div
                                className="ml-2 px-3 py-1.5 bg-white rounded-lg shadow-md border border-slate-200 max-w-[130px]"
                                style={{
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                }}
                            >
                                <div className="flex items-center gap-1">
                                    <span className="text-base">{node.item.emoji}</span>
                                    <span
                                        className="text-xs font-semibold text-slate-700 line-clamp-1"
                                        style={{ maxWidth: '90px' }}
                                    >
                                        {node.item.title}
                                    </span>
                                </div>
                                {node.item.type && (
                                    <span className={`text-[10px] ${node.item.type === 'food' ? 'text-orange-500' : 'text-teal-500'}`}>
                                        {node.item.type === 'food' ? '🍜 美食' : '📍 景点'}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer / Legend */}
            <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
                <div className="flex items-center justify-center gap-4 flex-wrap">
                    {tripPlan.timeline.map((day, idx) => {
                        const colors = dayColors.markers[idx % dayColors.markers.length];
                        const spots = day.items.filter(i => i.type === 'spot' || i.type === 'food');

                        return (
                            <div key={day.day} className="flex items-center gap-1.5">
                                <div className={`w-3 h-3 rounded-full ${colors.bg}`}></div>
                                <span className="text-xs text-slate-600">
                                    Day {day.day} ({spots.length}站)
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Watermark */}
                <div className="text-center mt-2">
                    <span className="text-[10px] text-slate-400">
                        由 AI Travel Planner 生成
                    </span>
                </div>
            </div>

            {/* Decorative compass */}
            <div className="absolute top-[100px] right-3 w-10 h-10 opacity-30 z-10">
                <Navigation className="w-full h-full text-slate-400" />
            </div>
        </div>
    );
}
