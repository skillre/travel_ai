'use client';

import { useState, useCallback } from 'react';
import { X } from 'lucide-react';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLogin: (code: string) => Promise<{ success: boolean; msg?: string }>;
    wechatName?: string;
    qrCodeUrl?: string;
}

export default function LoginModal({
    isOpen,
    onClose,
    onLogin,
    wechatName = 'skillre',
    qrCodeUrl = '/qrcode.png',
}: LoginModalProps) {
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [shake, setShake] = useState(false);

    const handleLogin = useCallback(async () => {
        if (!code.trim()) {
            setError('请输入解锁码');
            setShake(true);
            setTimeout(() => setShake(false), 500);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await onLogin(code.trim());
            if (result.success) {
                onClose();
                setCode('');
            } else {
                setError(result.msg || '登录失败，请重试');
                setShake(true);
                setTimeout(() => setShake(false), 500);
            }
        } catch (err) {
            setError('网络错误，请稍后重试');
            setShake(true);
            setTimeout(() => setShake(false), 500);
        } finally {
            setIsLoading(false);
        }
    }, [code, onLogin, onClose]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isLoading) {
            handleLogin();
        }
    }, [handleLogin, isLoading]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in">
            {/* 背景遮罩 */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* 弹窗内容 */}
            <div className="relative z-10 w-full max-w-md mx-4 animate-scale-in">
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                    {/* 头部 */}
                    <div className="relative px-6 pt-6 pb-4">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-tender-blue-100 to-fresh-green-100 mb-4">
                                <span className="text-3xl">🎫</span>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800">
                                登录开始规划
                            </h2>
                            <p className="text-slate-500 text-sm mt-2">
                                关注公众号获取专属解锁码
                            </p>
                        </div>
                    </div>

                    {/* 二维码区域 */}
                    <div className="px-6 pb-4">
                        <div className="bg-gradient-to-br from-slate-50 to-tender-blue-50/30 rounded-2xl p-5 border border-slate-100">
                            {/* 二维码 */}
                            <div className="flex justify-center mb-4">
                                <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
                                    <img
                                        src={qrCodeUrl}
                                        alt="公众号二维码"
                                        className="w-28 h-28 object-contain"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,' + encodeURIComponent(`
                                                <svg xmlns="http://www.w3.org/2000/svg" width="112" height="112" viewBox="0 0 112 112">
                                                    <rect fill="#f8fafc" width="112" height="112"/>
                                                    <text x="56" y="56" text-anchor="middle" dominant-baseline="middle" fill="#94a3b8" font-size="12">二维码</text>
                                                </svg>
                                            `);
                                        }}
                                    />
                                </div>
                            </div>

                            {/* 步骤说明 */}
                            <div className="space-y-2.5 text-sm">
                                <div className="flex items-center gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-tender-blue-500 text-white flex items-center justify-center text-xs font-bold">
                                        1
                                    </span>
                                    <p className="text-slate-600">
                                        微信扫码关注 <span className="text-tender-blue-600 font-medium">【{wechatName}】</span>
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-fresh-green-500 text-white flex items-center justify-center text-xs font-bold">
                                        2
                                    </span>
                                    <p className="text-slate-600">
                                        回复 <span className="text-fresh-green-600 font-medium bg-fresh-green-50 px-1.5 py-0.5 rounded">&apos;解锁&apos;</span> 获取专属码
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 输入区域 */}
                    <div className="px-6 pb-6 space-y-4">
                        <div className="relative">
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => {
                                    setCode(e.target.value);
                                    setError(null);
                                }}
                                onKeyDown={handleKeyDown}
                                placeholder="输入解锁码"
                                disabled={isLoading}
                                className={`
                                    w-full px-4 py-3.5 rounded-xl
                                    bg-slate-50 border-2
                                    text-slate-800 placeholder-slate-400
                                    focus:outline-none focus:bg-white
                                    transition-all duration-200
                                    ${error ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-tender-blue-400'}
                                    ${shake ? 'animate-shake' : ''}
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                `}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                            </div>
                        </div>

                        {/* 错误提示 */}
                        {error && (
                            <div className="flex items-center gap-2 text-red-500 text-sm animate-fade-in">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <span>{error}</span>
                            </div>
                        )}

                        {/* 登录按钮 */}
                        <button
                            onClick={handleLogin}
                            disabled={isLoading}
                            className={`
                                w-full py-3.5 rounded-xl font-medium text-white
                                transition-all duration-300 transform
                                ${isLoading
                                    ? 'bg-slate-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-tender-blue-500 to-fresh-green-500 hover:from-tender-blue-400 hover:to-fresh-green-400 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-tender-blue-500/25'
                                }
                            `}
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    登录中...
                                </span>
                            ) : (
                                '登录并开始'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

