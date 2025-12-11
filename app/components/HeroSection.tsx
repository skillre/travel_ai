'use client';

import { useState } from 'react';
import { ArrowRight, Sparkles, Map, History } from 'lucide-react';

interface HeroSectionProps {
    onSearch: (query: string) => void;
    onHistoryClick: () => void;
    isLoading: boolean;
}

export default function HeroSection({ onSearch, onHistoryClick, isLoading }: HeroSectionProps) {
    const [query, setQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    const handleGenerate = () => {
        if (query.trim()) {
            onSearch(query);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isLoading) {
            handleGenerate();
        }
    };

    return (
        <div className="relative w-full min-h-screen md:min-h-[85vh] flex flex-col items-center justify-center text-center px-4 py-8 animate-fade-in z-20">

            {/* 主内容容器 */}
            <div className="relative flex flex-col items-center max-w-5xl mx-auto w-full">

                {/* 浮动 Logo - 清新光效 */}
                <div className="mb-6 md:mb-12 relative group">
                    <div className="absolute inset-0 bg-tender-blue-400/30 rounded-full blur-[40px] group-hover:blur-[60px] transition-all duration-700 opacity-60" />
                    <div className="relative w-20 h-20 md:w-28 md:h-28 rounded-[2rem] md:rounded-[2.5rem] bg-gradient-to-br from-white/80 to-tender-blue-50/80 flex items-center justify-center shadow-glass border border-white/60 backdrop-blur-xl animate-float cursor-default hover:scale-105 transition-transform duration-500">
                        <span className="text-5xl md:text-7xl filter drop-shadow-sm transform group-hover:rotate-12 transition-transform duration-500">🌸</span>
                        {/* 内部高光 */}
                        <div className="absolute inset-0 rounded-[2rem] md:rounded-[2.5rem] bg-gradient-to-tr from-white/50 to-transparent pointer-events-none" />
                    </div>
                </div>

                {/* 标题 - 现代排版 */}
                <div className="space-y-4 md:space-y-6 mb-8 md:mb-16 relative">
                    <h1 className="text-3xl md:text-7xl font-bold text-slate-800 tracking-tight drop-shadow-sm leading-tight">
                        下一站，
                        <span className="relative inline-block ml-1 md:ml-3">
                            <span className="bg-gradient-to-r from-tender-blue-500 via-fresh-green-500 to-soft-pink-500 bg-clip-text text-transparent pb-2 animate-gradient">
                                去哪儿？
                            </span>
                            {/* 标题下划线光效 */}
                            <svg className="absolute -bottom-1 md:-bottom-2 left-0 w-full h-2 md:h-3 text-tender-blue-300/50" viewBox="0 0 100 10" preserveAspectRatio="none">
                                <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
                            </svg>
                        </span>
                    </h1>

                    <p className="text-base md:text-2xl text-slate-600 font-light max-w-2xl mx-auto leading-relaxed">
                        让 AI 为您定制一场 <span className="bg-tender-blue-100/80 text-tender-blue-700 px-2 py-0.5 rounded-lg font-medium mx-1">治愈心灵</span> 的完美旅程
                    </p>

                    {/* 特性标签 - 移动端隐藏 */}
                    <div className="hidden md:flex items-center justify-center gap-8 mt-8 text-sm text-slate-500 font-medium tracking-wide">
                        <span className="flex items-center gap-2 bg-white/40 px-4 py-1.5 rounded-full border border-white/50 shadow-sm"><Sparkles className="w-4 h-4 text-amber-400" /> 智能推荐</span>
                        <span className="flex items-center gap-2 bg-white/40 px-4 py-1.5 rounded-full border border-white/50 shadow-sm"><Map className="w-4 h-4 text-fresh-green-500" /> 地道路线</span>
                    </div>
                </div>

                {/* 搜索框 - 增强交互感 (Glass Light) */}
                <div className="w-full max-w-3xl relative mb-6 md:mb-16 group/search">
                    {/* 外部光晕 */}
                    <div className={`
                        absolute -inset-1 bg-gradient-to-r from-tender-blue-300 via-fresh-green-300 to-soft-pink-300 rounded-3xl blur-xl opacity-30 
                        transition-all duration-700
                        ${isFocused ? 'opacity-60 blur-2xl scale-[1.02]' : 'group-hover/search:opacity-40'}
                    `} />

                    <div className={`
                        relative flex items-center bg-white/70 backdrop-blur-2xl border transition-all duration-300 rounded-2xl overflow-hidden
                        ${isFocused ? 'border-tender-blue-300 ring-4 ring-tender-blue-100 shadow-xl' : 'border-white/60 hover:border-white/80 hover:bg-white/80 shadow-glass'}
                    `}>
                        <div className="pl-6 text-2xl animate-pulse text-tender-blue-500">✨</div>
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            onKeyPress={handleKeyPress}
                            placeholder="输入您的愿望，例如：大理洱海发呆、京都看樱花..."
                            className="flex-1 bg-transparent border-none text-slate-700 text-lg md:text-xl placeholder-slate-400 focus:ring-0 px-4 py-6 min-w-0 font-normal tracking-wide"
                            disabled={isLoading}
                        />
                        <div className="pr-3">
                            <button
                                onClick={handleGenerate}
                                disabled={isLoading || !query.trim()}
                                className={`
                                    hidden sm:flex items-center justify-center px-8 py-3.5 
                                    bg-gradient-to-r from-tender-blue-500 to-fresh-green-500 
                                    text-white font-semibold rounded-xl shadow-lg shadow-tender-blue-500/20 
                                    transition-all duration-300 
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                    ${!isLoading && query.trim() ? 'hover:scale-[1.03] hover:shadow-tender-blue-500/40 hover:from-tender-blue-400 hover:to-fresh-green-400' : ''}
                                `}
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span className="text-base">规划中...</span>
                                    </div>
                                ) : (
                                    <span className="flex items-center gap-2 text-base">
                                        开始 <ArrowRight className="w-5 h-5" />
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* 移动端按钮 */}
                <button
                    onClick={handleGenerate}
                    disabled={isLoading || !query.trim()}
                    className="w-full sm:hidden py-4 bg-gradient-to-r from-tender-blue-500 to-fresh-green-500 text-white font-bold rounded-xl shadow-lg shadow-tender-blue-500/30 disabled:opacity-50 mb-6 transform transition-transform active:scale-95"
                >
                    {isLoading ? '规划中...' : '开始规划'}
                </button>

                {/* 历史记录链接 */}
                <button
                    onClick={onHistoryClick}
                    className="group flex items-center gap-3 px-6 py-3 rounded-full bg-white/40 border border-white/60 hover:bg-white/60 hover:border-tender-blue-300 transition-all duration-300 backdrop-blur-md shadow-sm hover:shadow-md"
                >
                    <div className="w-8 h-8 rounded-full bg-tender-blue-100 flex items-center justify-center text-tender-blue-600 group-hover:scale-110 transition-transform">
                        <History className="w-4 h-4" />
                    </div>
                    <span className="text-slate-600 group-hover:text-tender-blue-700 font-medium text-sm tracking-wide">
                        查看我的历史行程
                    </span>
                </button>
            </div>
        </div>
    );
}
