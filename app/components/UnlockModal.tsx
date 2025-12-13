'use client';

import { useState, useEffect, useCallback } from 'react';

interface UnlockModalProps {
    /** 是否应该显示锁定状态（由父组件控制初始意图） */
    shouldLock?: boolean;
    /** 解锁成功后的回调 */
    onUnlocked?: () => void;
    /** 公众号名称 */
    wechatName?: string;
    /** 公众号二维码图片 URL */
    qrCodeUrl?: string;
}

interface VerifyResponse {
    valid: boolean;
    type?: 'VIP' | 'TRIAL';
    remaining?: number;
    msg?: string;
}

const STORAGE_KEY = 'is_unlocked';

export default function UnlockModal({
    shouldLock = true,
    onUnlocked,
    wechatName = '你的公众号名称',
    qrCodeUrl = '/qrcode.png', // 默认二维码路径
}: UnlockModalProps) {
    // 状态管理
    const [isLocked, setIsLocked] = useState(false); // 初始为 false，避免闪烁
    const [isChecking, setIsChecking] = useState(true); // 正在检查 localStorage
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<{ message: string; remaining?: number } | null>(null);
    const [shake, setShake] = useState(false);

    // 持久化检查：检查 localStorage 是否已解锁
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const unlocked = localStorage.getItem(STORAGE_KEY);
            if (unlocked === 'true') {
                setIsLocked(false);
                onUnlocked?.();
            } else if (shouldLock) {
                setIsLocked(true);
            }
            setIsChecking(false);
        }
    }, [shouldLock, onUnlocked]);

    // 震动动画结束后重置
    useEffect(() => {
        if (shake) {
            const timer = setTimeout(() => setShake(false), 500);
            return () => clearTimeout(timer);
        }
    }, [shake]);

    // 验证解锁码
    const handleVerify = useCallback(async () => {
        if (!code.trim()) {
            setError('请输入解锁码');
            setShake(true);
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch('/api/verify-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code: code.trim() }),
            });

            const data: VerifyResponse = await response.json();

            if (data.valid) {
                // 验证成功
                const successMsg = data.type === 'VIP'
                    ? '🎉 VIP 用户验证成功！'
                    : `✅ 验证成功！${data.remaining !== undefined ? `(剩余验证次数: ${data.remaining})` : ''}`;

                setSuccess({ message: successMsg, remaining: data.remaining });

                // 写入 localStorage
                localStorage.setItem(STORAGE_KEY, 'true');

                // 延迟关闭弹窗，让用户看到成功提示
                setTimeout(() => {
                    setIsLocked(false);
                    onUnlocked?.();
                }, 1500);
            } else {
                // 验证失败
                setError(data.msg || '验证失败，请重试');
                setShake(true);
            }
        } catch (err) {
            console.error('Verify error:', err);
            setError('网络错误，请稍后重试');
            setShake(true);
        } finally {
            setIsLoading(false);
        }
    }, [code, onUnlocked]);

    // 键盘回车提交
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isLoading) {
            handleVerify();
        }
    }, [handleVerify, isLoading]);

    // 正在检查 localStorage 时不渲染
    if (isChecking) {
        return null;
    }

    // 未锁定时不渲染
    if (!isLocked) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in">
            {/* 背景遮罩 - 毛玻璃效果 */}
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />

            {/* 弹窗内容 */}
            <div className="relative z-10 w-full max-w-md mx-4">
                <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl border border-white/10 p-6 sm:p-8 shadow-2xl">
                    {/* 标题 */}
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 mb-4">
                            <span className="text-3xl">🔐</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">
                            解锁完整行程方案
                        </h2>
                        <p className="text-slate-400 text-sm">
                            获取验证码，解锁 AI 生成的精彩行程
                        </p>
                    </div>

                    {/* 引导区 - 公众号二维码 */}
                    <div className="bg-slate-800/50 rounded-2xl p-5 mb-6 border border-white/5">
                        {/* 二维码 */}
                        <div className="flex justify-center mb-4">
                            <div className="bg-white rounded-xl p-3 shadow-lg">
                                <img
                                    src={qrCodeUrl}
                                    alt="公众号二维码"
                                    className="w-32 h-32 object-contain"
                                    onError={(e) => {
                                        // 二维码加载失败时显示占位
                                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,' + encodeURIComponent(`
                                            <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
                                                <rect fill="#f1f5f9" width="128" height="128"/>
                                                <text x="64" y="64" text-anchor="middle" dominant-baseline="middle" fill="#94a3b8" font-size="12">二维码</text>
                                            </svg>
                                        `);
                                    }}
                                />
                            </div>
                        </div>

                        {/* 步骤说明 */}
                        <div className="space-y-3 text-sm">
                            <div className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold">
                                    1
                                </span>
                                <p className="text-slate-300">
                                    关注公众号 <span className="text-cyan-400 font-medium">【{wechatName}】</span>
                                </p>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold">
                                    2
                                </span>
                                <p className="text-slate-300">
                                    回复关键词 <span className="text-cyan-400 font-medium">&apos;解锁&apos;</span> 获取验证码
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 输入区 */}
                    <div className="space-y-4">
                        <div className="relative">
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => {
                                    setCode(e.target.value);
                                    setError(null);
                                }}
                                onKeyDown={handleKeyDown}
                                placeholder="请输入解锁码"
                                disabled={isLoading}
                                className={`
                                    w-full px-4 py-3.5 rounded-xl
                                    bg-slate-800/80 border-2
                                    text-white placeholder-slate-500
                                    focus:outline-none focus:ring-0
                                    transition-all duration-200
                                    ${error ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-cyan-500/50'}
                                    ${shake ? 'animate-shake' : ''}
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                `}
                            />
                            {/* 输入框图标 */}
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                            </div>
                        </div>

                        {/* 错误提示 */}
                        {error && (
                            <div className="flex items-center gap-2 text-red-400 text-sm animate-fade-in">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <span>{error}</span>
                            </div>
                        )}

                        {/* 成功提示 */}
                        {success && (
                            <div className="flex items-center gap-2 text-green-400 text-sm animate-fade-in">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>{success.message}</span>
                            </div>
                        )}

                        {/* 验证按钮 */}
                        <button
                            onClick={handleVerify}
                            disabled={isLoading}
                            className={`
                                w-full py-3.5 rounded-xl font-medium text-white
                                transition-all duration-300 transform
                                ${isLoading
                                    ? 'bg-slate-700 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-cyan-500/25'
                                }
                            `}
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    校验中...
                                </span>
                            ) : (
                                '验证解锁'
                            )}
                        </button>
                    </div>

                    {/* 底部提示 */}
                    <p className="text-center text-slate-600 text-xs mt-6">
                        已有解锁码？直接在上方输入即可
                    </p>
                </div>
            </div>
        </div>
    );
}
