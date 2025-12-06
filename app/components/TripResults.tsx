'use client';

import dynamic from 'next/dynamic';

// 动态导入地图组件，禁用 SSR
const MapContainer = dynamic(() => import('./MapContainer'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-white/5">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-cyan-400 text-sm font-medium">地图加载中...</p>
            </div>
        </div>
    ),
});

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

interface TripData {
    city: string;
    total_days: number;
    trip_overview: string;
    daily_plan: DailyPlan[];
}

interface TripResultsProps {
    tripData: TripData;
}

export default function TripResults({ tripData }: TripResultsProps) {
    return (
        <div className="flex flex-col md:flex-row h-full absolute inset-0 md:p-6 gap-4 md:gap-6 animate-fade-in-up delay-200">
            {/* 行程列表区域 - 移动端下部，桌面端左侧 */}
            <div className="order-2 md:order-1 h-[45%] md:h-full md:w-[400px] lg:w-[450px] shrink-0 flex flex-col">
                <div className="glass-card rounded-2xl md:rounded-3xl overflow-hidden flex flex-col h-full border border-white/10 shadow-2xl">
                    {/* 标题概览 */}
                    <div className="px-6 py-5 border-b border-white/10 bg-gradient-to-r from-cyan-900/20 to-blue-900/20 backdrop-blur-md">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <span className="text-3xl">📍</span>
                                {tripData.city}
                            </h2>
                            <span className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-cyan-300 text-xs font-bold uppercase tracking-wider">
                                {tripData.total_days} DAYS
                            </span>
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed line-clamp-2">
                            {tripData.trip_overview}
                        </p>
                    </div>

                    {/* 可滚动列表 */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8 scroll-smooth hover:scroll-auto custom-scrollbar">
                        {tripData.daily_plan.map((day, dayIdx) => (
                            <div key={day.day} className="relative animate-fade-in-up" style={{ animationDelay: `${dayIdx * 100}ms` }}>
                                {/* 天数指示器 (Sticky) */}
                                <div className="sticky top-0 z-10 flex items-center gap-4 mb-4 bg-slate-900/90 backdrop-blur-xl py-2 -mx-2 px-2 rounded-lg border-b border-white/5 shadow-sm">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg ring-2 ring-white/10"
                                        style={{
                                            backgroundColor: [
                                                '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
                                                '#FFEAA7', '#DDA0DD', '#98D8C8'
                                            ][day.day - 1] || '#6366f1'
                                        }}
                                    >
                                        D{day.day}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-white font-bold text-lg">第 {day.day} 天</span>
                                        <span className="text-slate-500 text-xs uppercase tracking-wider font-medium">Daily Plan</span>
                                    </div>
                                </div>

                                {/* 路线时间轴 */}
                                <div className="relative pl-5 ml-5 border-l-2 border-dashed border-white/10 space-y-6">
                                    {day.routes.map((route, index) => (
                                        <div key={index} className="relative group">
                                            {/* 时间轴节点 */}
                                            <div className="absolute -left-[27px] top-4 w-3 h-3 rounded-full bg-slate-800 border-2 border-cyan-500 z-10 group-hover:scale-125 transition-transform duration-300 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />

                                            <div
                                                className="glass hover:bg-white/10 rounded-xl p-4 transition-all duration-300 cursor-pointer border border-white/5 hover:border-cyan-500/30 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)] group-hover:-translate-y-1"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="w-6 h-6 shrink-0 rounded-full bg-white/10 flex items-center justify-center text-xs text-slate-400 font-mono">
                                                        {index + 1}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-white font-semibold text-lg group-hover:text-cyan-400 transition-colors">
                                                            {route.name}
                                                        </h4>
                                                        <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                                                            {route.desc}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        <div className="h-10 text-center text-slate-600 text-sm italic py-4">
                            ~ 旅程结束 ~
                        </div>
                    </div>
                </div>
            </div>

            {/* 地图区域 - 移动端上部，桌面端右侧 */}
            <div className="order-1 md:order-2 flex-1 relative h-[55%] md:h-full rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                <div className="absolute inset-0 z-0">
                    <MapContainer dailyPlan={tripData.daily_plan} />
                </div>
                {/* 装饰性阴影 */}
                <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_40px_rgba(0,0,0,0.3)] rounded-2xl md:rounded-3xl" />
            </div>
        </div>
    );
}
