'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import HeroSection from './components/HeroSection';
import Header from './components/Header';
import TripResults from './components/TripResults';

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

    const handleGenerate = async (overrideQuery?: string) => {
        const searchQuery = overrideQuery || query;
        if (!searchQuery.trim()) {
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
                body: JSON.stringify({ context: searchQuery }),
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
        <main className="min-h-screen bg-slate-950 text-white selection:bg-cyan-500/30 selection:text-white overflow-hidden relative">
            {/* 动态背景 */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black" />
                <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-cyan-900/10 to-transparent opacity-50" />
            </div>

            {/* 内容区域 */}
            <div className="relative z-10 h-screen flex flex-col">
                {tripData ? (
                    <>
                        <Header
                            onSearch={(q) => {
                                setQuery(q);
                                handleGenerate(q);
                            }}
                            onHistoryClick={() => setIsHistoryOpen(true)}
                            isLoading={isLoading}
                            initialQuery={query}
                        />
                        <div className="flex-1 relative overflow-hidden">
                            <TripResults tripData={tripData} />
                        </div>
                    </>
                ) : (
                    <HeroSection
                        onSearch={(q) => {
                            setQuery(q);
                            handleGenerate(q);
                        }}
                        onHistoryClick={() => setIsHistoryOpen(true)}
                        isLoading={isLoading}
                    />
                )}
            </div>

            {/* 全局 Loading 遮罩 for history */}
            {isLoadingHistory && (
                <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center animate-fade-in">
                    <div className="flex flex-col items-center gap-6 p-8 rounded-3xl bg-slate-900/90 border border-white/10 shadow-2xl">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center text-xl">📚</div>
                        </div>
                        <p className="text-cyan-400 font-medium tracking-wide">正在读取历史记录...</p>
                    </div>
                </div>
            )}

            {/* 错误提示 Toast */}
            {error && (
                <div className="fixed top-24 right-4 z-50 animate-fade-in-up">
                    <div className="bg-red-500/10 backdrop-blur-xl border border-red-500/20 text-red-400 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3">
                        <span className="text-xl">⚠️</span>
                        <p>{error}</p>
                        <button onClick={() => setError(null)} className="ml-4 hover:text-white transition-colors">✕</button>
                    </div>
                </div>
            )}

            <HistoryPanel
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                onSelectRecord={handleSelectHistory}
            />
        </main>
    );
}
