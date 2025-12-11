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
    const [isFocused, setIsFocused] = useState(false);

    const handleGenerate = () => {
        if (query.trim()) {
            onSearch(query);
            setIsFocused(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isLoading) {
            handleGenerate();
        }
    };

    return (
        <header className="sticky top-0 z-50 glass/80 backdrop-blur-md border-b border-white/40 shadow-sm animate-fade-in-up">
            <div className="max-w-7xl mx-auto px-4 py-2">
                <div className="flex items-center gap-3 w-full">
                    {/* Search Bar - Auto Expand */}
                    <div className={`
                        transition-all duration-300 ease-in-out
                        ${isFocused ? 'flex-1' : 'flex-[2]'}
                    `}>
                        <div className="relative group w-full">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setTimeout(() => setIsFocused(false), 200)} // Delay to allow button click
                                onKeyPress={handleKeyPress}
                                placeholder={isFocused ? "输入旅行需求..." : "输入新的旅行需求..."}
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
                    </div>

                    {/* Action Buttons - Hide on Focus */}
                    <div className={`
                        flex items-center gap-2 overflow-hidden transition-all duration-300
                        ${isFocused ? 'w-0 opacity-0' : 'w-auto opacity-100'}
                    `}>
                        <button
                            onClick={handleGenerate}
                            disabled={isLoading}
                            className="bg-gradient-to-r from-tender-blue-500 to-fresh-green-500 text-white rounded-xl shadow-lg shadow-tender-blue-500/20 px-4 py-2.5 text-sm font-medium hover:scale-[1.02] active:scale-95 transition-all whitespace-nowrap"
                        >
                            重新生成
                        </button>

                        <div className="w-px h-8 bg-slate-200 mx-1" />

                        <button
                            onClick={onHistoryClick}
                            className="flex flex-col items-center justify-center w-12 py-1 bg-white/50 hover:bg-white border border-slate-200/50 rounded-xl text-slate-600 hover:text-tender-blue-600 transition-all"
                            title="历史记录"
                        >
                            <span className="text-lg leading-none mb-0.5">📚</span>
                            <span className="text-[10px] font-medium leading-none">历史</span>
                        </button>

                        <button
                            onClick={() => window.location.reload()}
                            className="flex flex-col items-center justify-center w-12 py-1 bg-white/50 hover:bg-white border border-slate-200/50 rounded-xl text-slate-600 hover:text-tender-blue-600 transition-all"
                            title="返回首页"
                        >
                            <span className="text-lg leading-none mb-0.5">✈️</span>
                            <span className="text-[10px] font-medium leading-none">首页</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
