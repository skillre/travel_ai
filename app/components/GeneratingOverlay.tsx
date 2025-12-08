'use client';

import { useEffect, useState } from 'react';

interface GeneratingOverlayProps {
    isVisible: boolean;
    progress: number;
    message: string;
    step: string;
}

const stepEmojis: Record<string, string> = {
    connecting: '🔗',
    processing: '🧠',
    generating: '✨',
    parsing: '📊',
    finalizing: '🎯',
};

const stepLabels: Record<string, string> = {
    connecting: '连接服务',
    processing: '分析需求',
    generating: '生成行程',
    parsing: '解析数据',
    finalizing: '整理结果',
};

export default function GeneratingOverlay({ isVisible, progress, message, step }: GeneratingOverlayProps) {
    const [displayProgress, setDisplayProgress] = useState(0);

    // 平滑进度动画
    useEffect(() => {
        if (progress > displayProgress) {
            const timer = setTimeout(() => {
                setDisplayProgress(prev => Math.min(prev + 1, progress));
            }, 20);
            return () => clearTimeout(timer);
        }
    }, [progress, displayProgress]);

    // 重置进度当不可见时
    useEffect(() => {
        if (!isVisible) {
            setDisplayProgress(0);
        }
    }, [isVisible]);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
            {/* 背景遮罩 */}
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" />

            {/* 内容 */}
            <div className="relative z-10 w-full max-w-md mx-4">
                <div className="bg-slate-900/80 backdrop-blur-2xl rounded-3xl border border-white/10 p-8 shadow-2xl">
                    {/* 动画图标 */}
                    <div className="flex justify-center mb-8">
                        <div className="relative">
                            {/* 外圈 */}
                            <div className="w-24 h-24 rounded-full border-4 border-slate-700" />
                            {/* 进度圈 */}
                            <svg className="absolute inset-0 w-24 h-24 -rotate-90">
                                <circle
                                    cx="48"
                                    cy="48"
                                    r="44"
                                    fill="none"
                                    stroke="url(#progress-gradient)"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    strokeDasharray={`${displayProgress * 2.76} 276`}
                                    className="transition-all duration-300"
                                />
                                <defs>
                                    <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#06b6d4" />
                                        <stop offset="100%" stopColor="#3b82f6" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            {/* 中心内容 */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-3xl animate-float">{stepEmojis[step] || '🌏'}</span>
                            </div>
                        </div>
                    </div>

                    {/* 进度百分比 */}
                    <div className="text-center mb-6">
                        <span className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                            {displayProgress}%
                        </span>
                    </div>

                    {/* 消息 */}
                    <p className="text-center text-white font-medium mb-6 text-lg">
                        {message}
                    </p>

                    {/* 步骤指示器 */}
                    <div className="flex justify-center gap-2 mb-4">
                        {['connecting', 'processing', 'generating', 'parsing', 'finalizing'].map((s, index) => {
                            const stepIndex = ['connecting', 'processing', 'generating', 'parsing', 'finalizing'].indexOf(step);
                            const isActive = index === stepIndex;
                            const isComplete = index < stepIndex;

                            return (
                                <div
                                    key={s}
                                    className={`w-2 h-2 rounded-full transition-all duration-300 ${isActive
                                            ? 'w-8 bg-gradient-to-r from-cyan-500 to-blue-500'
                                            : isComplete
                                                ? 'bg-cyan-500'
                                                : 'bg-slate-700'
                                        }`}
                                />
                            );
                        })}
                    </div>

                    {/* 当前步骤标签 */}
                    <p className="text-center text-slate-500 text-sm">
                        {stepLabels[step] || step}
                    </p>
                </div>

                {/* 提示文字 */}
                <p className="text-center text-slate-600 text-xs mt-4">
                    AI 正在为您规划最佳行程，请稍候...
                </p>
            </div>
        </div>
    );
}
