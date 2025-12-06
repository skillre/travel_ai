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
        <header className="sticky top-0 z-50 glass border-b border-white/5 shadow-2xl shadow-black/20 animate-fade-in-up">
            <div className="max-w-7xl mx-auto px-4 py-3">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* Logo */}
                    <div
                        className="flex items-center gap-3 shrink-0 cursor-pointer group"
                        onClick={() => window.location.reload()}
                    >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all duration-300 group-hover:scale-105">
                            <span className="text-xl">🌏</span>
                        </div>
                        <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent hidden md:block">
                            AI 旅行规划师
                        </h1>
                    </div>

                    {/* Search Bar */}
                    <div className="flex-1 flex gap-3 w-full sm:w-auto sm:ml-8">
                        <div className="relative flex-1 group">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="输入新的旅行需求..."
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all text-sm"
                                disabled={isLoading}
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors">🔍</span>

                            {isLoading && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleGenerate}
                            disabled={isLoading}
                            className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-medium rounded-xl shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 whitespace-nowrap"
                        >
                            重新生成
                        </button>

                        <div className="w-px h-10 bg-white/10 mx-1 hidden sm:block" />

                        <button
                            onClick={onHistoryClick}
                            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 hover:text-white transition-all flex items-center gap-2 text-sm"
                            title="历史记录"
                        >
                            <span>📚</span>
                            <span className="hidden sm:inline">历史</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
