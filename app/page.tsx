'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

// 动态导入地图组件，禁用 SSR
const MapContainer = dynamic(() => import('./components/MapContainer'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-primary-700 font-medium">地图组件加载中...</p>
            </div>
        </div>
    ),
});

// 动态导入历史记录面板
const HistoryPanel = dynamic(() => import('./components/HistoryPanel'), {
    ssr: false,
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

export default function Home() {
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tripData, setTripData] = useState<TripData | null>(null);
    const [workflowRunId, setWorkflowRunId] = useState<string | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    const handleGenerate = async () => {
        if (!query.trim()) {
            setError('请输入您的旅行需求');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/generate-plan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ context: query }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || '生成失败');
            }

            setTripData(result.data);
            setWorkflowRunId(result.workflow_run_id || null);
        } catch (err) {
            setError(err instanceof Error ? err.message : '生成行程失败，请稍后重试');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectHistory = async (pageId: string) => {
        setIsLoadingHistory(true);
        setError(null);

        try {
            const response = await fetch(`/api/history/${pageId}`);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || '加载失败');
            }

            setTripData(result.data);
            setWorkflowRunId(pageId);
        } catch (err) {
            setError(err instanceof Error ? err.message : '加载历史记录失败');
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isLoading) {
            handleGenerate();
        }
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* 顶部输入区域 */}
            <header className="sticky top-0 z-30 backdrop-blur-xl bg-slate-900/80 border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        {/* Logo 和标题 */}
                        <div className="flex items-center gap-3 shrink-0">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                                <span className="text-2xl">🌏</span>
                            </div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                                AI 旅行规划师
                            </h1>
                        </div>

                        {/* 输入框和按钮 */}
                        <div className="flex-1 flex gap-3 w-full sm:w-auto">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="输入您的旅行需求，如：厦门2日游、美食和拍照"
                                    className="w-full px-5 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all"
                                    disabled={isLoading || isLoadingHistory}
                                />
                                {(isLoading || isLoadingHistory) && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={handleGenerate}
                                disabled={isLoading || isLoadingHistory}
                                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 whitespace-nowrap"
                            >
                                {isLoading ? '生成中...' : '生成行程'}
                            </button>
                            {/* 历史记录按钮 */}
                            <button
                                onClick={() => setIsHistoryOpen(true)}
                                className="px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white transition-all flex items-center gap-2"
                                title="历史记录"
                            >
                                <span>📚</span>
                                <span className="hidden sm:inline">历史</span>
                            </button>
                        </div>
                    </div>

                    {/* 错误提示 */}
                    {error && (
                        <div className="mt-3 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                            ⚠️ {error}
                        </div>
                    )}

                    {/* 当前记录 ID */}
                    {workflowRunId && (
                        <div className="mt-3 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-cyan-400 text-xs font-mono inline-block">
                            记录 ID: {workflowRunId.substring(0, 20)}...
                        </div>
                    )}
                </div>
            </header>

            {/* 主内容区域 */}
            <div className="flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>
                {/* 加载历史记录时的遮罩 */}
                {isLoadingHistory && (
                    <div className="absolute inset-0 z-20 bg-slate-900/80 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                            <p className="text-white font-medium">加载历史记录...</p>
                        </div>
                    </div>
                )}

                {/* 地图区域 - 60% 高度 */}
                <div className="h-[60%] p-4">
                    {tripData ? (
                        <MapContainer dailyPlan={tripData.daily_plan} />
                    ) : (
                        <div className="w-full h-full rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center border border-white/10">
                            <div className="text-center px-8">
                                <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center animate-float">
                                    <span className="text-5xl">🗺️</span>
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-3">开始您的旅程</h2>
                                <p className="text-gray-400 max-w-md">
                                    在上方输入您的旅行需求，AI 将为您规划完美的行程路线
                                </p>
                                <button
                                    onClick={() => setIsHistoryOpen(true)}
                                    className="mt-6 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
                                >
                                    📚 查看历史记录
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 行程列表区域 - 40% 高度 */}
                <div className="h-[40%] px-4 pb-4 overflow-hidden">
                    {tripData ? (
                        <div className="h-full bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 overflow-hidden">
                            {/* 行程概览标题 */}
                            <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                            <span>📍</span>
                                            {tripData.city} {tripData.total_days}日行程
                                        </h2>
                                        <p className="text-gray-400 text-sm mt-1">{tripData.trip_overview}</p>
                                    </div>
                                    <div className="px-3 py-1 bg-cyan-500/20 rounded-full text-cyan-400 text-sm font-medium">
                                        {tripData.daily_plan.reduce((acc, day) => acc + day.routes.length, 0)} 个景点
                                    </div>
                                </div>
                            </div>

                            {/* 行程列表 */}
                            <div className="overflow-y-auto h-[calc(100%-76px)] px-6 py-4 space-y-6">
                                {tripData.daily_plan.map((day) => (
                                    <div key={day.day} className="relative">
                                        {/* 天数标签 */}
                                        <div className="flex items-center gap-3 mb-3">
                                            <div
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg"
                                                style={{
                                                    backgroundColor: [
                                                        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
                                                        '#FFEAA7', '#DDA0DD', '#98D8C8'
                                                    ][day.day - 1] || '#6366f1'
                                                }}
                                            >
                                                D{day.day}
                                            </div>
                                            <span className="text-white font-semibold">第 {day.day} 天</span>
                                        </div>

                                        {/* 景点列表 */}
                                        <div className="ml-4 pl-4 border-l-2 border-white/10 space-y-3">
                                            {day.routes.map((route, index) => (
                                                <div
                                                    key={index}
                                                    className="group relative bg-white/5 hover:bg-white/10 rounded-xl p-4 transition-all cursor-pointer border border-transparent hover:border-white/20"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        {/* 序号 */}
                                                        <div className="w-6 h-6 shrink-0 rounded-full bg-white/10 flex items-center justify-center text-xs text-gray-400 font-medium">
                                                            {index + 1}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="text-white font-medium truncate group-hover:text-cyan-400 transition-colors">
                                                                {route.name}
                                                            </h4>
                                                            <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                                                                {route.desc}
                                                            </p>
                                                        </div>
                                                        {/* 箭头指示 */}
                                                        {index < day.routes.length - 1 && (
                                                            <span className="absolute -bottom-2 left-8 text-gray-500 text-lg">↓</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 flex items-center justify-center">
                            <div className="text-center text-gray-500">
                                <span className="text-4xl mb-3 block">📋</span>
                                <p>行程列表将显示在这里</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 历史记录面板 */}
            <HistoryPanel
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                onSelectRecord={handleSelectHistory}
            />
        </main>
    );
}
