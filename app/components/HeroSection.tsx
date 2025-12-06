'use client';

import { useState } from 'react';

interface HeroSectionProps {
    onSearch: (query: string) => void;
    onHistoryClick: () => void;
    isLoading: boolean;
}

export default function HeroSection({ onSearch, onHistoryClick, isLoading }: HeroSectionProps) {
    const [query, setQuery] = useState('');

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
        <div className="relative w-full h-full min-h-[80vh] flex flex-col items-center justify-center text-center px-4 animate-fade-in">
            {/* 装饰性背景元素 */}
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />

            <div className="relative z-10 flex flex-col items-center max-w-4xl mx-auto w-full">
                {/* Logo / Icon */}
                <div className="mb-8 animate-float">
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-2xl shadow-cyan-500/40 border border-white/20 backdrop-blur-sm">
                        <span className="text-6xl filter drop-shadow-lg">🌏</span>
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight drop-shadow-lg">
                    下一站，<span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">去哪儿？</span>
                </h1>

                <p className="text-lg md:text-xl text-slate-300 mb-12 max-w-2xl font-light leading-relaxed">
                    AI 智能规划，为您定制专属完美旅程。<br />
                    <span className="text-slate-400 text-base">探索美食、景点和地道文化体验</span>
                </p>

                {/* Search Box */}
                <div className="w-full max-w-2xl relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
                    <div className="relative flex items-center bg-slate-900/50 backdrop-blur-xl border border-white/20 rounded-2xl p-2 transition-all duration-300 hover:bg-slate-900/60 focus-within:bg-slate-900/70 focus-within:border-cyan-400/50 focus-within:ring-1 focus-within:ring-cyan-400/30 shadow-2xl">
                        <span className="pl-4 text-2xl animate-pulse">✨</span>
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="输入您的旅行愿望，例如：厦门2日游、美食和拍照..."
                            className="flex-1 bg-transparent border-none text-white text-lg placeholder-slate-400 focus:ring-0 px-4 py-4 min-w-0"
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleGenerate}
                            disabled={isLoading || !query.trim()}
                            className="hidden sm:flex items-center justify-center px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/30 transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>规划中...</span>
                                </div>
                            ) : (
                                <span className="flex items-center gap-2">
                                    开始规划 <span>→</span>
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Button (Separate for better UX on small screens) */}
                <button
                    onClick={handleGenerate}
                    disabled={isLoading || !query.trim()}
                    className="mt-4 w-full sm:hidden py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/30 disabled:opacity-50"
                >
                    {isLoading ? '规划中...' : '开始规划'}
                </button>

                {/* History Link */}
                <button
                    onClick={onHistoryClick}
                    className="mt-16 flex items-center gap-2 text-slate-400 hover:text-white transition-all duration-300 group px-4 py-2 rounded-full hover:bg-white/5"
                >
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-cyan-500/20 group-hover:text-cyan-400 transition-colors">
                        📚
                    </div>
                    <span className="font-medium">查看我的历史行程</span>
                </button>
            </div>
        </div>
    );
}
