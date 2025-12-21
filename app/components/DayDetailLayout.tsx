import React from 'react';
import { Clock, MapPin, AlertTriangle, Wallet, Bus, Train, Footprints, Car } from 'lucide-react';
import { TripPlanDay, TripPlanItem, TripPlanMeta } from '../types';

interface DayDetailLayoutProps {
    dayPlan: TripPlanDay;
    meta: TripPlanMeta; // For city name
    className?: string;
    id?: string; // ID for html2canvas
    showQRCode?: boolean; // Whether to show QR code in footer
    qrCodeUrl?: string; // QR code image URL
    renderImage: (props: { title: string; city: string; type: 'spot' | 'food'; resolvedImageUrl?: string }) => React.ReactNode;
}

// Day color configuration
const dayColors = [
    { accent: '#3b82f6', accentBg: '#dbeafe', text: 'text-blue-600', bg: 'bg-blue-500', lightBg: 'bg-blue-50', border: 'border-blue-200' },
    { accent: '#f97316', accentBg: '#ffedd5', text: 'text-orange-600', bg: 'bg-orange-500', lightBg: 'bg-orange-50', border: 'border-orange-200' },
    { accent: '#10b981', accentBg: '#d1fae5', text: 'text-emerald-600', bg: 'bg-emerald-500', lightBg: 'bg-emerald-50', border: 'border-emerald-200' },
    { accent: '#8b5cf6', accentBg: '#ede9fe', text: 'text-violet-600', bg: 'bg-violet-500', lightBg: 'bg-violet-50', border: 'border-violet-200' },
    { accent: '#ec4899', accentBg: '#fce7f3', text: 'text-pink-600', bg: 'bg-pink-500', lightBg: 'bg-pink-50', border: 'border-pink-200' },
    { accent: '#06b6d4', accentBg: '#cffafe', text: 'text-cyan-600', bg: 'bg-cyan-500', lightBg: 'bg-cyan-50', border: 'border-cyan-200' },
    { accent: '#eab308', accentBg: '#fef9c3', text: 'text-yellow-600', bg: 'bg-yellow-500', lightBg: 'bg-yellow-50', border: 'border-yellow-200' },
];

// Extract stay duration from sub_title
const extractStayDuration = (item: TripPlanItem): string => {
    if (!item.sub_title) return '';

    const durationMatch = item.sub_title.match(/(?:建议[游玩用餐]*\s*)?(\d+[小时分钟]+)/);
    if (durationMatch) {
        return durationMatch[1];
    }

    const englishMatch = item.sub_title.match(/(\d+)\s*(h|hour|min)/i);
    if (englishMatch) {
        const value = englishMatch[1];
        const unit = englishMatch[2].toLowerCase();
        if (unit === 'h' || unit === 'hour') {
            return `${value}小时`;
        } else if (unit === 'min') {
            return `${value}分钟`;
        }
    }

    return '';
};

// Extract transport info from sub_title
const extractTransportInfo = (item: TripPlanItem): { mode: string; duration: string; icon: React.ReactNode } | null => {
    if (!item.sub_title) return null;

    // Match patterns like "距上一站步行 300m" or "地铁10分钟" or "打车15分钟"
    const walkMatch = item.sub_title.match(/步行\s*(\d+[m米分钟]*)/i);
    if (walkMatch) {
        return { mode: '步行', duration: walkMatch[1], icon: <Footprints size={14} /> };
    }

    const subwayMatch = item.sub_title.match(/地铁\s*(\d+[分钟]*)/i);
    if (subwayMatch) {
        return { mode: '地铁', duration: subwayMatch[1], icon: <Train size={14} /> };
    }

    const busMatch = item.sub_title.match(/公交\s*(\d+[分钟]*)/i);
    if (busMatch) {
        return { mode: '公交', duration: busMatch[1], icon: <Bus size={14} /> };
    }

    const taxiMatch = item.sub_title.match(/(?:打车|出租车|滴滴)\s*(\d+[分钟]*)/i);
    if (taxiMatch) {
        return { mode: '打车', duration: taxiMatch[1], icon: <Car size={14} /> };
    }

    return null;
};

export default function DayDetailLayout({
    dayPlan,
    meta,
    className = '',
    id,
    showQRCode = true,
    qrCodeUrl,
    renderImage
}: DayDetailLayoutProps) {
    const colorScheme = dayColors[(dayPlan.day - 1) % dayColors.length];
    const containerWidth = 400; // Fixed width for portrait export

    return (
        <div
            id={id}
            data-export-container="true"
            className={`bg-white relative ${className}`}
            style={{
                width: `${containerWidth}px`,
                minHeight: '600px',
                borderRadius: '16px',
                overflow: 'hidden',
            }}
        >
            {/* Header Section */}
            <div
                className="relative px-5 py-6"
                style={{
                    background: `linear-gradient(135deg, ${colorScheme.accent} 0%, ${colorScheme.accent}dd 100%)`,
                }}
            >
                {/* Background decoration */}
                <div className="absolute inset-0 opacity-10">
                    <svg className="w-full h-full" viewBox="0 0 400 120" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="350" cy="30" r="60" fill="white" />
                        <circle cx="50" cy="100" r="40" fill="white" />
                    </svg>
                </div>

                <div className="relative z-10">
                    {/* Day badge */}
                    <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                            <span className="text-white/70 text-sm font-medium">DAY</span>
                            <span className="text-white text-2xl font-black">{dayPlan.day}</span>
                        </div>
                        <div className="h-0.5 flex-1 bg-white/30 rounded-full"></div>
                    </div>

                    {/* Theme */}
                    <h2 className="text-white text-xl font-bold leading-tight mb-1">
                        {dayPlan.date_theme || dayPlan.day_summary}
                    </h2>

                    {/* City */}
                    <div className="flex items-center gap-1.5 text-white/80 text-sm">
                        <MapPin size={14} />
                        <span>{meta.city}</span>
                    </div>
                </div>
            </div>

            {/* Timeline Content */}
            <div className="relative px-5 py-4">
                {/* Timeline line */}
                <div
                    className="absolute left-[30px] top-4 bottom-4 w-0.5 rounded-full"
                    style={{ backgroundColor: colorScheme.accentBg }}
                ></div>

                {/* Items */}
                <div className="flex flex-col gap-4">
                    {dayPlan.items.map((item, idx) => {
                        const isFood = item.type === 'food';
                        const stayDuration = extractStayDuration(item);
                        const transportInfo = extractTransportInfo(item);
                        const hasInfoBox = item.content?.highlight_text;

                        return (
                            <div key={idx} className="relative">
                                {/* Transport indicator (between items, not for first) */}
                                {idx > 0 && transportInfo && (
                                    <div className="flex items-center gap-2 mb-3 ml-[42px]">
                                        <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-full text-slate-500 text-xs">
                                            {transportInfo.icon}
                                            <span>{transportInfo.mode}</span>
                                            <span className="text-slate-400">|</span>
                                            <span>{transportInfo.duration}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Content block */}
                                <div className="flex gap-3">
                                    {/* Timeline node */}
                                    <div className="flex-shrink-0 flex flex-col items-center z-10">
                                        <div
                                            className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md ${isFood ? 'bg-orange-500' : colorScheme.bg}`}
                                        >
                                            {idx + 1}
                                        </div>
                                    </div>

                                    {/* Card */}
                                    <div
                                        className={`flex-1 rounded-xl overflow-hidden shadow-sm border ${isFood ? 'border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50' : 'border-slate-100 bg-white'}`}
                                    >
                                        {/* Image (for both spots and food) */}
                                        <div
                                            className="relative w-full overflow-hidden"
                                            style={{ height: '100px' }}
                                        >
                                            {renderImage({
                                                title: item.title,
                                                city: meta.city,
                                                type: item.type as 'spot' | 'food',
                                                resolvedImageUrl: item.resolvedImageUrl
                                            })}

                                            {/* Time label badge */}
                                            <div className={`absolute top-2 left-2 px-2 py-0.5 backdrop-blur-sm text-white text-[10px] font-medium rounded-full ${isFood ? 'bg-orange-500/70' : 'bg-black/50'}`}>
                                                {item.time_label}
                                            </div>

                                            {/* Duration badge */}
                                            {stayDuration && (
                                                <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-white/90 backdrop-blur-sm text-slate-700 text-[10px] font-medium rounded-full">
                                                    <Clock size={10} />
                                                    <span>{stayDuration}</span>
                                                </div>
                                            )}

                                            {/* Food type badge */}
                                            {isFood && (
                                                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-orange-500/80 backdrop-blur-sm text-white text-[10px] font-bold rounded-full">
                                                    美食
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="p-3">
                                            {/* Title row */}
                                            <div className="flex items-start justify-between gap-2 mb-1.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">{item.emoji}</span>
                                                    <h4 className="font-bold text-slate-800 text-sm leading-tight">
                                                        {item.title}
                                                    </h4>
                                                </div>

                                                {/* Cost for food */}
                                                {isFood && item.cost > 0 && (
                                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-600 text-xs font-medium rounded-full">
                                                        <Wallet size={10} />
                                                        <span>¥{item.cost}/人</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Description */}
                                            <p className="text-xs text-slate-500 leading-relaxed mb-2 line-clamp-2">
                                                {item.content?.desc || item.sub_title}
                                            </p>

                                            {/* Tags */}
                                            {item.tags && item.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mb-2">
                                                    {item.tags.slice(0, 3).map((tag) => (
                                                        <span
                                                            key={tag}
                                                            className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${isFood ? 'bg-orange-100 text-orange-600' : 'bg-indigo-50 text-indigo-600'}`}
                                                        >
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Info Box (Highlight/Tips) */}
                                            {hasInfoBox && (
                                                <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                                                    <div className="flex items-start gap-2">
                                                        <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                                                        <div>
                                                            <span className="text-amber-700 text-[10px] font-bold block mb-0.5">
                                                                {item.content?.highlight_label || '温馨提示'}
                                                            </span>
                                                            <p className="text-amber-600 text-xs leading-relaxed">
                                                                {item.content?.highlight_text}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Footer with QR Code */}
            {showQRCode && (
                <div className="px-5 py-4 border-t border-slate-100 bg-slate-50">
                    <div className="flex items-center justify-center gap-4">
                        {/* QR Code placeholder */}
                        <div className="w-14 h-14 bg-white rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden">
                            {qrCodeUrl ? (
                                <img src={qrCodeUrl} alt="QR Code" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-10 h-10 bg-slate-200 rounded grid grid-cols-3 gap-0.5 p-1">
                                    {[...Array(9)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`${i % 3 === 0 || i === 4 || i === 8 ? 'bg-slate-700' : 'bg-slate-400'}`}
                                        ></div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium text-slate-700">长按扫码获取同款路线</p>
                            <p className="text-xs text-slate-400 mt-0.5">AI Travel Planner</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom decoration */}
            <div
                className="h-1.5"
                style={{
                    background: `linear-gradient(90deg, ${colorScheme.accent} 0%, ${colorScheme.accent}88 100%)`,
                }}
            ></div>
        </div>
    );
}
