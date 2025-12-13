'use client';

import { useEffect, useState, useRef } from 'react';

interface GeneratingOverlayProps {
    isVisible: boolean;
    loadingText: string;
    progress?: number;
}

export default function GeneratingOverlay({ isVisible, loadingText, progress = 0 }: GeneratingOverlayProps) {
    const [displayProgress, setDisplayProgress] = useState(0);
    const [displayText, setDisplayText] = useState(loadingText);
    const [isTextAnimating, setIsTextAnimating] = useState(false);

    // 平滑进度条动画
    useEffect(() => {
        if (progress > displayProgress) {
            const timer = setTimeout(() => {
                setDisplayProgress(prev => Math.min(prev + 1, progress));
            }, 20);
            return () => clearTimeout(timer);
        }
    }, [progress, displayProgress]);

    // 文本切换动画
    useEffect(() => {
        if (loadingText !== displayText) {
            setIsTextAnimating(true);
            const timer = setTimeout(() => {
                setDisplayText(loadingText);
                setIsTextAnimating(false);
            }, 300); // 等待淡出动画完成
            return () => clearTimeout(timer);
        }
    }, [loadingText, displayText]);

    // 重置状态
    useEffect(() => {
        if (!isVisible) {
            setDisplayProgress(0);
            setDisplayText("准备出发...");
        }
    }, [isVisible]);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in font-sans">
            {/* 动态背景 - 极光效果 */}
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-30">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-500/30 rounded-full blur-[100px] animate-pulse-slow" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/30 rounded-full blur-[100px] animate-pulse-slow animation-delay-2000" />
                </div>
            </div>

            {/* 核心内容 */}
            <div className="relative z-10 flex flex-col items-center max-w-md w-full px-8">

                {/* 3D 地球与飞机动画 */}
                <div className="relative w-48 h-48 mb-12 flex items-center justify-center">
                    {/* 轨道圈 */}
                    <div className="absolute inset-0 border border-white/10 rounded-full animate-spin-slow-reverse"
                        style={{ transform: 'rotateX(70deg)' }} />

                    {/* 第二条装饰轨道 */}
                    <div className="absolute inset-4 border border-white/5 rounded-full animate-spin-slower"
                        style={{ transform: 'rotateY(70deg)' }} />

                    {/* 地球本体 */}
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full shadow-[0_0_50px_rgba(59,130,246,0.5)] flex items-center justify-center relative overflow-hidden group">
                        {/* 地球纹理/高光 */}
                        <div className="absolute inset-0 bg-[url('https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/svg/1F30D.svg')] bg-cover opacity-20 animate-spin-slow bg-blend-overlay" />
                        <div className="absolute top-2 right-4 w-6 h-3 bg-white/20 rounded-full rotate-45 blur-sm" />
                    </div>

                    {/* 飞行动画容器 */}
                    <div className="absolute inset-0 animate-orbit">
                        {/* 飞机主体 - 位于轨道上 */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] filter">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full rotate-90 transform">
                                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                            </svg>
                            {/* 尾迹粒子 */}
                            <div className="absolute top-full left-1/2 w-1 h-8 bg-gradient-to-b from-blue-400 to-transparent -translate-x-1/2 opacity-50 blur-[1px]" />
                        </div>
                    </div>
                </div>

                {/* 动态文本区域 */}
                <div className="h-20 flex flex-col items-center justify-center w-full relative">
                    {/* 使用两层实现平滑交叉淡入淡出 */}
                    <div
                        className={`text-2xl font-bold bg-gradient-to-r from-blue-200 via-white to-blue-200 bg-clip-text text-transparent text-center transition-all duration-300 transform
                        ${isTextAnimating ? 'opacity-0 translate-y-4 blur-sm' : 'opacity-100 translate-y-0 blur-0'}`}
                    >
                        {displayText}
                    </div>

                    {/* 加载点 */}
                    <div className="flex gap-1 mt-4">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-0" />
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-75" />
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-150" />
                    </div>
                </div>

                {/* 进度条 (可选，保持极简视觉) */}
                <div className="w-full h-1 bg-white/10 rounded-full mt-8 overflow-hidden backdrop-blur-sm">
                    <div
                        className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                        style={{ width: `${displayProgress}%` }}
                    />
                </div>

                <p className="mt-2 text-xs text-slate-500 font-mono tracking-wider">
                    {displayProgress}% COMPLETED
                </p>

            </div>

            <style jsx>{`
                @keyframes orbit {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .animate-orbit {
                    animation: orbit 4s linear infinite;
                }
                .animate-spin-slow {
                    animation: spin 20s linear infinite;
                }
                .animate-spin-slower {
                    animation: spin 30s linear infinite;
                }
                .animate-spin-slow-reverse {
                    animation: spin 25s linear infinite reverse;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
