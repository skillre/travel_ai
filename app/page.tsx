'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import HeroSection from './components/HeroSection';
import Header from './components/Header';
import TripResults from './components/TripResults';
import GeneratingOverlay from './components/GeneratingOverlay';
import { TripData } from './types';

// 动态导入历史记录面板
const HistoryPanel = dynamic(() => import('./components/HistoryPanel'), {
    ssr: false,
});

// 动态导入粒子背景 (Canvas 仅客户端)
const ParticleBackground = dynamic(() => import('./components/ParticleBackground'), {
    ssr: false,
});

interface ProgressState {
    progress: number;
    message: string;
    step: string;
}

export default function Home() {
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tripData, setTripData] = useState<TripData | null>(null);
    const [workflowRunId, setWorkflowRunId] = useState<string | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // 进度状态
    const [progressState, setProgressState] = useState<ProgressState>({
        progress: 0,
        message: '准备中...',
        step: 'connecting'
    });

    const handleGenerate = useCallback(async (overrideQuery?: string) => {
        const searchQuery = overrideQuery || query;
        if (!searchQuery.trim()) {
            setError('请输入您的旅行需求');
            return;
        }

        setIsLoading(true);
        setError(null);
        setProgressState({ progress: 0, message: '准备中...', step: 'connecting' });

        try {
            const response = await fetch('/api/generate-plan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ context: searchQuery }),
            });

            if (!response.ok) {
                throw new Error('请求失败');
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('无法读取响应');
            }

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // 处理 SSE 数据
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const event = JSON.parse(line.slice(6));

                            if (event.type === 'progress') {
                                setProgressState({
                                    progress: event.progress,
                                    message: event.message,
                                    step: event.step
                                });
                            } else if (event.type === 'complete') {
                                setTripData(event.data);
                                setWorkflowRunId(event.workflow_run_id || null);
                                setProgressState({
                                    progress: 100,
                                    message: '完成！',
                                    step: 'finalizing'
                                });
                            } else if (event.type === 'error') {
                                throw new Error(event.error);
                            }
                        } catch (parseError) {
                            // 忽略解析错误，继续处理
                        }
                    }
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '生成行程失败，请稍后重试');
        } finally {
            setIsLoading(false);
        }
    }, [query]);

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

    return (
        <main className="min-h-screen bg-cream-50 text-slate-800 selection:bg-tender-blue-200 selection:text-slate-900 overflow-hidden relative font-sans">
            {/* 动态背景 - 清新温柔风 */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-br from-cream-50 via-tender-blue-50/50 to-soft-pink-50/30 animate-gradient bg-[length:200%_200%]" />
                <div className="absolute top-0 inset-x-0 h-[600px] bg-gradient-to-b from-white/80 via-white/20 to-transparent" />

                {/* 装饰性光晕 */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-tender-blue-200/30 rounded-full blur-[100px] animate-float-slow" />
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-soft-pink-100/40 rounded-full blur-[120px] animate-float-delayed" />

                {/* 仅在首页（非结果页）显示粒子背景 */}
                {!tripData && <ParticleBackground />}
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

            {/* 生成进度遮罩 */}
            <GeneratingOverlay
                isVisible={isLoading}
                progress={progressState.progress}
                message={progressState.message}
                step={progressState.step}
            />

            {/* 全局 Loading 遮罩 for history */}
            {isLoadingHistory && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center animate-fade-in">
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
