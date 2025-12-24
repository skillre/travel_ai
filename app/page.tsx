'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import HeroSection from './components/HeroSection';
import Header from './components/Header';
import TripResults from './components/TripResults';
import GeneratingOverlay from './components/GeneratingOverlay';
import LoginModal from './components/LoginModal';
import UserProfileModal from './components/UserProfileModal';
import { TripData } from './types';
import { useUser } from './contexts/UserContext';

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
    const { user, login, logout, updateAvatar, updateUserName, refreshUser } = useUser();

    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tripData, setTripData] = useState<TripData | null>(null);
    const [workflowRunId, setWorkflowRunId] = useState<string | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // 登录弹窗状态
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [pendingQuery, setPendingQuery] = useState<string | null>(null);

    // 用户信息弹窗状态
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    // 进度状态
    const [progressState, setProgressState] = useState<ProgressState>({
        progress: 0,
        message: '准备中...',
        step: 'connecting'
    });

    // 处理需要登录的情况
    const handleStartWithLogin = useCallback((inputQuery: string) => {
        setPendingQuery(inputQuery);
        setIsLoginModalOpen(true);
    }, []);

    // 登录成功后的处理
    const handleLoginSuccess = useCallback(async (code: string) => {
        const result = await login(code);
        if (result.success && pendingQuery) {
            // 登录成功后自动开始生成
            setIsLoginModalOpen(false);
            setQuery(pendingQuery);
            // 延迟一下确保状态更新
            setTimeout(() => {
                handleGenerate(pendingQuery);
            }, 100);
            setPendingQuery(null);
        }
        return result;
    }, [login, pendingQuery]);

    const handleGenerate = useCallback(async (overrideQuery?: string) => {
        const searchQuery = overrideQuery || query;
        if (!searchQuery.trim()) {
            setError('请输入您的旅行需求');
            return;
        }

        // 检查用户是否登录
        if (!user) {
            handleStartWithLogin(searchQuery);
            return;
        }

        // 检查用户是否有剩余次数（VIP 用户无限制）
        if (user.status !== 'VIP' && user.usedCount >= user.maxLimit) {
            setError('您的使用次数已用尽，请联系客服升级');
            return;
        }

        setIsLoading(true);
        setError(null);
        setProgressState({
            progress: 0,
            message: 'AI 正在启动...',
            step: 'connecting'
        });

        try {
            const response = await fetch('/api/generate-plan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    context: searchQuery,
                    userId: user.id, // 传递用户ID
                }),
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

                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) continue;

                    if (trimmedLine.startsWith('PROGRESS:')) {
                        const message = trimmedLine.slice(9);

                        setProgressState(prev => {
                            const currentProgress = prev.progress;
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

                        try {
                            const historyRes = await fetch(`/api/history/${id}`, {
                                cache: 'no-store'
                            });

                            if (!historyRes.ok) {
                                throw new Error('获取行程详情失败');
                            }

                            const historyResult = await historyRes.json();
                            setTripData(historyResult.data);

                            // 刷新用户信息以更新使用次数
                            await refreshUser();
                        } catch (fetchErr) {
                            console.error(fetchErr);
                            throw new Error('获取最终行程失败，请前往历史记录查看');
                        }

                    } else if (trimmedLine === 'HEARTBEAT') {
                        setProgressState(prev => ({
                            ...prev,
                            progress: Math.min(prev.progress + 0.2, 95),
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
    }, [query, user, handleStartWithLogin, refreshUser]);

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

    // 处理用户头像点击（触发同步）
    const handleUserClick = useCallback(async () => {
        if (user) {
            setIsProfileModalOpen(true);
            // 触发同步：点击头像时同步用户信息
            await refreshUser();
        } else {
            setIsLoginModalOpen(true);
        }
    }, [user, refreshUser]);

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
                            user={user}
                            onUserClick={handleUserClick}
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
                        user={user}
                        onUserClick={handleUserClick}
                        onStartWithLogin={handleStartWithLogin}
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

            {/* 历史记录面板 */}
            <HistoryPanel
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                onSelectRecord={handleSelectHistory}
                userId={user?.id}
            />

            {/* 登录弹窗 */}
            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => {
                    setIsLoginModalOpen(false);
                    setPendingQuery(null);
                }}
                onLogin={handleLoginSuccess}
                wechatName="skillre"
                qrCodeUrl="/qrcode.png"
            />

            {/* 用户信息弹窗 */}
            {user && (
                <UserProfileModal
                    isOpen={isProfileModalOpen}
                    onClose={() => setIsProfileModalOpen(false)}
                    user={user}
                    onLogout={logout}
                    onUpdateAvatar={updateAvatar}
                    onUpdateUserName={updateUserName}
                />
            )}
        </main>
    );
}
