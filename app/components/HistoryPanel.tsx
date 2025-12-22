'use client';

import { useState, useEffect } from 'react';
import { X, Clock, ArrowRight, RefreshCw, Inbox, User, Globe } from 'lucide-react';

interface HistoryRecord {
    id: string;
    title: string;
    workflow_run_id: string;
    has_plan_data: boolean;
    created_time: string;
    is_public?: boolean;
    is_own?: boolean;
}

interface HistoryPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectRecord: (id: string) => void;
    userId?: string | null; // 当前登录用户ID
}

export default function HistoryPanel({ isOpen, onClose, onSelectRecord, userId }: HistoryPanelProps) {
    const [records, setRecords] = useState<HistoryRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchHistory();
        }
    }, [isOpen, userId]);

    const fetchHistory = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // 构建 URL，如果有 userId 则带上参数
            const url = userId
                ? `/api/history?userId=${encodeURIComponent(userId)}`
                : '/api/history';

            const response = await fetch(url, {
                cache: 'no-store',
            });
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
                className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={onClose}
            />

            {/* 侧边面板 - 浅色主题 */}
            <div
                className={`fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                {/* 头部 */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-teal-500" />
                        历史记录
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* 内容区域 */}
                <div className="h-[calc(100%-64px)] overflow-y-auto p-4 bg-slate-50/50">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                            <div className="w-10 h-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-slate-500">加载中...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                            <span className="text-4xl">😔</span>
                            <p className="text-red-500">{error}</p>
                            <button
                                onClick={fetchHistory}
                                className="px-4 py-2 bg-teal-500 hover:bg-teal-600 rounded-lg text-sm text-white transition-colors flex items-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                重试
                            </button>
                        </div>
                    ) : records.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
                            <Inbox className="w-12 h-12" />
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
                                        ? 'bg-white border-slate-200 hover:border-teal-300 hover:shadow-md cursor-pointer'
                                        : 'bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed'
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-slate-800 font-semibold truncate">
                                                    {record.title}
                                                </h3>
                                                {/* 标签：自己的记录 or 公共记录 */}
                                                {record.is_own && (
                                                    <span className="flex-shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-tender-blue-100 text-tender-blue-600 rounded">
                                                        <User className="w-2.5 h-2.5" />
                                                        我的
                                                    </span>
                                                )}
                                                {record.is_public && (
                                                    <span className="flex-shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-500 rounded">
                                                        <Globe className="w-2.5 h-2.5" />
                                                        公开
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatDate(record.created_time)}
                                            </p>
                                        </div>
                                        {record.has_plan_data ? (
                                            <div className="shrink-0 w-8 h-8 rounded-full bg-teal-50 text-teal-500 flex items-center justify-center">
                                                <ArrowRight className="w-4 h-4" />
                                            </div>
                                        ) : (
                                            <span className="shrink-0 text-xs text-slate-400 px-2 py-1 bg-slate-100 rounded">
                                                无数据
                                            </span>
                                        )}
                                    </div>
                                    {record.workflow_run_id && (
                                        <p className="text-[10px] text-slate-300 mt-2 font-mono truncate">
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
