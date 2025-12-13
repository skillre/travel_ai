'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import HeroSection from './components/HeroSection';
import Header from './components/Header';
import TripResults from './components/TripResults';
import GeneratingOverlay from './components/GeneratingOverlay';
import UnlockModal from './components/UnlockModal';
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
    const [isUnlocked, setIsUnlocked] = useState(false);

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
        // 初始化状态
        setProgressState({
            progress: 0,
            message: 'AI 正在启动...',
            step: 'connecting' // 这里的 step 只是为了兼容接口，实际展示主要靠 message
        });

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

                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;

                // 处理新的协议 (PROGRESS:..., DONE:..., HEARTBEAT)
                const lines = buffer.split('\n');
                // 保留最后一个可能不完整的行 (如果没有换行符，全保留)
                // 注意：如果最后一行是完整的且以\n结尾，split会产生一个空串在最后，buffer变成空串，这是对的。
                // 如果最后一行不完整，它会留在buffer里。
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) continue;

                    if (trimmedLine.startsWith('PROGRESS:')) {
                        const message = trimmedLine.slice(9);

                        // 收到新的文本，更新 loadingText，并根据新消息触发一个小进度跳跃
                        setProgressState(prev => {
                            const currentProgress = prev.progress;
                            // 每次文案变更，进度前进一点，最大90%（留给DONE）
                            // 简单的逻辑：步进 5-10%
                            let nextProgress = currentProgress + Math.random() * 5 + 2;
                            if (nextProgress > 90) nextProgress = 90;

                            return {
                                progress: nextProgress,
                                message: message,
                                step: 'processing'
                            };
                        });

                    } else if (trimmedLine.startsWith('DONE:')) {
                        const id = trimmedLine.slice(5);
                        setWorkflowRunId(id);

                        setProgressState(prev => ({
                            ...prev,
                            progress: 100,
                            message: '生成完成！正在加载行程...',
                            step: 'finalizing'
                        }));

                        // 使用 ID 获取完整行程数据
                        try {
                            const historyRes = await fetch(`/api/history/${id}`, {
                                cache: 'no-store'
                            });

                            if (!historyRes.ok) {
                                throw new Error('获取行程详情失败');
                            }

                            const historyResult = await historyRes.json();
                            setTripData(historyResult.data);
                        } catch (fetchErr) {
                            console.error(fetchErr);
                            // 如果获取失败，可能是 ID 不是 Notion Page ID 或者稍微有些延迟
                            // 这里可以重试，或者报错。暂时报错。
                            throw new Error('获取最终行程失败，请前往历史记录查看');
                        }

                    } else if (trimmedLine === 'HEARTBEAT') {
                        // 心跳不更新文案，只轻微推动进度条
                        setProgressState(prev => ({
                            ...prev,
                            progress: Math.min(prev.progress + 0.2, 95),
                            // 保持现有 message 不变
                            message: prev.message,
                            step: prev.step
                        }));
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
            const response = await fetch(`/api/history/${pageId}`, {
                cache: 'no-store',
            });
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
                        <div className={`flex-1 relative overflow-hidden transition-all duration-500 ${!isUnlocked ? 'blur-md pointer-events-none select-none' : ''}`}>
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
                loadingText={progressState.message}
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

            {/* 解锁验证弹窗 - 仅在有行程数据且未解锁时显示 */}
            {tripData && (
                <UnlockModal
                    shouldLock={!isUnlocked}
                    onUnlocked={() => setIsUnlocked(true)}
                    wechatName="skillre"
                    qrCodeUrl="/qrcode.png"
                />
            )}
        </main>
    );
}
