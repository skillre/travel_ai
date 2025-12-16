'use client';

import React from 'react';
import Image from 'next/image';
import { MapPin, Clock, Camera, Wallet, Utensils } from 'lucide-react';
import { TripPlan, TripPlanItem } from '../types';

interface TripCheatsheetViewProps {
    tripPlan: TripPlan;
    className?: string;
    id?: string; // ID for html2canvas
}

const dayColors = [
    'border-red-500', 'border-orange-500', 'border-yellow-500', 'border-green-500',
    'border-cyan-500', 'border-violet-500', 'border-pink-500',
];

const dayTextColors = [
    'text-red-600', 'text-orange-600', 'text-yellow-600', 'text-green-600',
    'text-cyan-600', 'text-violet-600', 'text-pink-600',
];

const dayBgColors = [
    'bg-red-50', 'bg-orange-50', 'bg-yellow-50', 'bg-green-50',
    'bg-cyan-50', 'bg-violet-50', 'bg-pink-50',
];

export default function TripCheatsheetView({ tripPlan, className = '', id }: TripCheatsheetViewProps) {
    return (
        // Main Container: Force horizontal layout even on mobile for export
        <div
            id={id}
            className={`flex flex-row gap-8 p-12 bg-slate-50 min-w-max items-stretch ${className}`}
        >
            {/* Header / Meta Column (Optional, or just put title at top of image?) 
                Let's put a Title Header at the start if needed, or just let days flow.
                Design Ref suggests: "Main Container... flex flex-row".
             */}

            {tripPlan.timeline.map((day, index) => {
                const colorClass = dayColors[index % dayColors.length];
                const textClass = dayTextColors[index % dayTextColors.length];
                const bgClass = dayBgColors[index % dayBgColors.length];

                return (
                    <div key={day.day} className="w-[320px] shrink-0 flex flex-col gap-6">
                        {/* Day Header */}
                        <div className="flex flex-col gap-2 pb-4 border-b-4 border-slate-200">
                            <div className="flex items-center gap-2">
                                <span className={`text-4xl font-black ${textClass} opacity-20`}>DAY</span>
                                <span className={`text-5xl font-black ${textClass}`}>{day.day}</span>
                            </div>
                            <div className={`h-1.5 w-16 rounded-full ${bgClass.replace('bg-', 'bg-').replace('50', '500')}`}></div>
                            <h3 className="text-lg font-bold text-slate-700 leading-tight mt-1">{day.day_summary}</h3>
                        </div>

                        {/* Simulated Map Node Chain */}
                        <div className="flex items-center justify-between px-2 py-4">
                            <div className="w-full flex items-center justify-between relative">
                                {/* Connecting Line */}
                                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-300 -z-10 border-t border-dashed border-slate-300"></div>

                                {/* Nodes (Take first 3 spots for brevity) */}
                                {day.items.filter(i => i.type === 'spot').slice(0, 3).map((item, idx) => (
                                    <div key={idx} className="flex flex-col items-center gap-1 bg-slate-50 px-1">
                                        <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ${bgClass.replace('bg-', 'bg-').replace('50', '500')}`}></div>
                                        <span className="text-[10px] text-slate-500 font-medium max-w-[60px] truncate">{item.title}</span>
                                    </div>
                                ))}
                                {day.items.filter(i => i.type === 'spot').length > 3 && (
                                    <div className="flex flex-col items-center gap-1 bg-slate-50 px-1">
                                        <div className="w-3 h-3 rounded-full bg-slate-300 border-2 border-white shadow-sm"></div>
                                        <span className="text-[10px] text-slate-400">...</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Spots List */}
                        <div className="flex flex-col gap-0">
                            {day.items.map((item, itemIdx) => (
                                <div key={itemIdx} className="relative group">
                                    {/* Connector Line (except for last item) */}
                                    {itemIdx < day.items.length - 1 && (
                                        <div className="absolute left-8 top-[60px] bottom-[-20px] w-0.5 border-l-2 border-dashed border-slate-300 z-0"></div>
                                    )}

                                    {/* Card */}
                                    <div className={`relative z-10 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-8 ${colorClass} border-l-[6px]`}>
                                        {/* Image Area */}
                                        <div className="h-32 w-full bg-slate-100 relative">
                                            {/* We rely on generic images or map placeholders if no real image */}
                                            {/* In a real app we'd have a helper to get the image URL */}
                                            <div className="absolute inset-0 flex items-center justify-center text-slate-300 bg-slate-50">
                                                {item.type === 'food' ? <Utensils size={32} /> : <Camera size={32} />}
                                            </div>
                                            {/* Simulated Image Load (Placeholder for now) */}
                                            {/* <Image ... /> */}

                                            <div className="absolute top-2 right-2 flex gap-1">
                                                {item.cost === 0 && (
                                                    <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-0.5">
                                                        <Wallet size={10} /> 免费
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Content Area */}
                                        <div className="p-4">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h4 className="font-bold text-slate-800 text-lg leading-tight">{item.title}</h4>
                                                <div className="shrink-0 text-xl">{item.emoji}</div>
                                            </div>
                                            <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                                                {item.content?.desc || item.sub_title}
                                            </p>

                                            {/* Tags */}
                                            <div className="flex flex-wrap gap-1.5">
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded-md font-medium">
                                                    {item.time_label}
                                                </span>
                                                {item.tags?.slice(0, 2).map(tag => (
                                                    <span key={tag} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] rounded-md font-medium">
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Connector Badge (Travel Time) - Render primarily if not last item */}
                                    {itemIdx < day.items.length - 1 && (
                                        <div className="absolute left-1/2 -translate-x-1/2 bottom-[-14px] z-20">
                                            <div className="bg-slate-100 border border-slate-200 text-slate-500 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                                <Clock size={10} />
                                                <span>15m</span>
                                                {/* Note: logic for actual travel time would go here if available */}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
