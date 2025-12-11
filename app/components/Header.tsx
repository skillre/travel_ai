'use client';

import { useState } from 'react';

interface HeaderProps {
    onSearch: (query: string) => void;
    onHistoryClick: () => void;
    isLoading: boolean;
    initialQuery?: string;
}

export default function Header({ onSearch, onHistoryClick, isLoading, initialQuery = '' }: HeaderProps) {
    const [query, setQuery] = useState(initialQuery);

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
        <header className="sticky top-0 z-50 glass/80 backdrop-blur-md border-b border-white/40 shadow-sm animate-fade-in-up">
            <div className="max-w-7xl mx-auto px-4 py-3">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* Logo - Fresh Style */}
                    <div
                        className="flex items-center gap-3 shrink-0 cursor-pointer group"
                        onClick={() => window.location.reload()}
                    >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-tender-blue-400 to-fresh-green-400 flex items-center justify-center shadow-lg shadow-tender-blue-500/20 group-hover:shadow-tender-blue-500/30 transition-all duration-300 group-hover:scale-105 text-white">
                            <span className="text-xl">✈️</span>
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-lg font-bold bg-gradient-to-r from-tender-blue-600 to-fresh-green-500 bg-clip-text text-transparent hidden md:block tracking-tight leading-tight">
                                AI 旅行规划师
                            </h1>
                        </div>
                    </div>

                    {/* Search Bar - Light/Clean */}
                    <div className="flex-1 flex gap-3 w-full sm:w-auto sm:ml-8">
                        <div className="relative flex-1 group">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="输入新的旅行需求..."
                                className="w-full pl-10 pr-4 py-2.5 bg-white/60 border border-slate-200/60 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-tender-blue-400/50 focus:border-tender-blue-400/50 hover:bg-white/80 transition-all text-sm shadow-inner-sm"
                                disabled={isLoading}
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-tender-blue-500 transition-colors">🔍</span>

                            {isLoading && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <div className="w-4 h-4 border-2 border-tender-blue-400 border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleGenerate}
                            disabled={isLoading}
                            className="px-5 py-2.5 bg-gradient-to-r from-tender-blue-500 to-fresh-green-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-tender-blue-500/20 hover:shadow-tender-blue-500/30 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 whitespace-nowrap"
                        >
                            重新生成
                        </button>

                        <div className="w-px h-8 bg-slate-200 mx-1 hidden sm:block self-center" />

                        <button
                            onClick={onHistoryClick}
                            className="px-4 py-2.5 bg-white/50 hover:bg-white border border-slate-200/50 rounded-xl text-slate-600 hover:text-tender-blue-600 transition-all flex items-center gap-2 text-sm shadow-sm hover:shadow-md"
                            title="历史记录"
                        >
                            <span>📚</span>
                            <span className="hidden sm:inline">历史</span>
                        </button>

                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2.5 bg-white/50 hover:bg-white border border-slate-200/50 rounded-xl text-slate-600 hover:text-tender-blue-600 transition-all flex items-center gap-2 text-sm shadow-sm hover:shadow-md"
                            title="返回首页"
                        >
                            <span>✈️</span>
                            <span className="hidden sm:inline">首页</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
