'use client';

import { useState, useEffect } from 'react';

interface HistoryRecord {
    id: string;
    title: string;
    workflow_run_id: string;
    has_plan_data: boolean;
    created_time: string;
}

interface HistoryPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectRecord: (id: string) => void;
}

export default function HistoryPanel({ isOpen, onClose, onSelectRecord }: HistoryPanelProps) {
    const [records, setRecords] = useState<HistoryRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchHistory();
        }
    }, [isOpen]);

    const fetchHistory = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/history');
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || '获取历史记录失败');
            }

            setRecords(result.records || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : '获取失败');
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleSelectRecord = (record: HistoryRecord) => {
        if (!record.has_plan_data) {
            return;
        }
        onSelectRecord(record.id);
        onClose();
    };

    return (
        <>
            {/* 背景遮罩 */}
            <div
                className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={onClose}
            />

            {/* 侧边面板 */}
            <div
                className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-slate-900 border-l border-white/10 z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                {/* 头部 */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <span>📚</span>
                        历史记录
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* 内容区域 */}
                <div className="h-[calc(100%-64px)] overflow-y-auto p-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                            <div className="w-10 h-10 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                            <p className="text-gray-400">加载中...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                            <span className="text-4xl">😔</span>
                            <p className="text-red-400">{error}</p>
                            <button
                                onClick={fetchHistory}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white transition-colors"
                            >
                                重试
                            </button>
                        </div>
                    ) : records.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
                            <span className="text-4xl">📭</span>
                            <p>暂无历史记录</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {records.map((record) => (
                                <button
                                    key={record.id}
                                    onClick={() => handleSelectRecord(record)}
                                    disabled={!record.has_plan_data}
                                    className={`w-full text-left p-4 rounded-xl border transition-all ${record.has_plan_data
                                            ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-cyan-500/50 cursor-pointer'
                                            : 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed'
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-white font-medium truncate">
                                                {record.title}
                                            </h3>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {formatDate(record.created_time)}
                                            </p>
                                        </div>
                                        {record.has_plan_data ? (
                                            <span className="shrink-0 text-cyan-400 text-lg">→</span>
                                        ) : (
                                            <span className="shrink-0 text-xs text-gray-500 px-2 py-1 bg-white/5 rounded">
                                                无数据
                                            </span>
                                        )}
                                    </div>
                                    {record.workflow_run_id && (
                                        <p className="text-xs text-gray-600 mt-2 font-mono truncate">
                                            ID: {record.workflow_run_id.substring(0, 16)}...
                                        </p>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
