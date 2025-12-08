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
        <div className="relative w-full h-full min-h-[85vh] flex flex-col items-center justify-center text-center px-4 animate-fade-in z-20">

            {/* 主内容容器 */}
            <div className="relative flex flex-col items-center max-w-5xl mx-auto w-full">

                {/* 浮动 Logo - 增强光效 */}
                <div className="mb-10 relative group">
                    <div className="absolute inset-0 bg-cyan-500/30 rounded-full blur-[40px] group-hover:blur-[60px] transition-all duration-700 opacity-50" />
                    <div className="relative w-28 h-28 rounded-[2rem] bg-gradient-to-br from-cyan-400/90 to-blue-600/90 flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.4)] border border-white/20 backdrop-blur-md animate-float cursor-default hover:scale-105 transition-transform duration-500">
                        <span className="text-7xl filter drop-shadow-md">🌏</span>
                        {/* 内部高光 */}
                        <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />
                    </div>
                </div>

                {/* 标题 - 更大更现代的排版 */}
                <div className="space-y-4 mb-14 relative">
                    <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight drop-shadow-2xl leading-tight">
                        下一站，
                        <span className="relative inline-block">
                            <span className="bg-gradient-to-r from-cyan-300 via-cyan-400 to-blue-400 bg-clip-text text-transparent pb-2">
                                去哪儿？
                            </span>
                            {/* 标题下划线光效 */}
                            <svg className="absolute -bottom-2 left-0 w-full h-3 text-cyan-500/50" viewBox="0 0 100 10" preserveAspectRatio="none">
                                <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="2" fill="none" />
                            </svg>
                        </span>
                    </h1>

                    <p className="text-xl md:text-2xl text-slate-300 font-light max-w-2xl mx-auto leading-relaxed opacity-90">
                        AI 智能规划，为您定制 <span className="text-cyan-200 font-medium">专属完美旅程</span>
                    </p>

                    {/* 特性标签 */}
                    <div className="flex items-center justify-center gap-6 mt-6 text-sm text-slate-400 font-medium tracking-wide">
                        <span className="flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-amber-400" /> 智能推荐</span>
                        <span className="w-1 h-1 bg-slate-600 rounded-full" />
                        <span className="flex items-center gap-1.5"><Map className="w-4 h-4 text-emerald-400" /> 地道路线</span>
                    </div>
                </div>

                {/* 搜索框 - 增强交互感 */}
                <div className="w-full max-w-3xl relative mb-16">
                    {/* 外部光晕 - 聚焦时增强 */}
                    <div className={`
                        absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-2xl blur-lg opacity-30 
                        transition-all duration-500
                        ${isFocused ? 'opacity-60 blur-xl scale-[1.02]' : 'group-hover:opacity-40'}
                    `} />

                    <div className={`
                        relative flex items-center bg-slate-900/60 backdrop-blur-2xl border transition-all duration-300 rounded-2xl overflow-hidden
                        ${isFocused ? 'border-cyan-400/50 ring-2 ring-cyan-500/20 bg-slate-900/80 shadow-2xl' : 'border-white/10 hover:border-white/20 hover:bg-slate-900/70'}
                    `}>
                        <div className="pl-6 text-2xl animate-pulse text-cyan-400">✨</div>
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            onKeyPress={handleKeyPress}
                            placeholder="输入您的旅行愿望，例如：北京3日游、故宫和烤鸭..."
                            className="flex-1 bg-transparent border-none text-white text-lg md:text-xl placeholder-slate-400/70 focus:ring-0 px-4 py-5 min-w-0 font-light tracking-wide"
                            disabled={isLoading}
                        />
                        <div className="pr-2">
                            <button
                                onClick={handleGenerate}
                                disabled={isLoading || !query.trim()}
                                className={`
                                    hidden sm:flex items-center justify-center px-8 py-3.5 
                                    bg-gradient-to-r from-cyan-500 to-blue-600 
                                    text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/20 
                                    transition-all duration-300 
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                    ${!isLoading && query.trim() ? 'hover:scale-[1.03] hover:shadow-cyan-500/40 hover:from-cyan-400 hover:to-blue-500' : ''}
                                `}
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span className="text-base">规划中...</span>
                                    </div>
                                ) : (
                                    <span className="flex items-center gap-2 text-base">
                                        开始规划 <ArrowRight className="w-5 h-5" />
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
                    className="w-full sm:hidden py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/30 disabled:opacity-50 mb-12 transform transition-transform active:scale-95"
                >
                    {isLoading ? '规划中...' : '开始规划'}
                </button>

                {/* 历史记录链接 - 胶囊样式 */}
                <button
                    onClick={onHistoryClick}
                    className="group flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-cyan-500/30 transition-all duration-300 backdrop-blur-sm shadow-xl"
                >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-cyan-300 group-hover:scale-110 transition-transform">
                        <History className="w-4 h-4" />
                    </div>
                    <span className="text-slate-300 group-hover:text-white font-medium text-sm tracking-wide">
                        查看我的历史行程
                    </span>
                </button>
            </div>
        </div>
    );
}
