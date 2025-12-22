'use client';

import { useState, useRef } from 'react';
import { X, Crown, Zap, Ban, LogOut, Link2, Upload, Check, AlertCircle } from 'lucide-react';
import { UserInfo } from '../types';

interface UserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: UserInfo;
    onLogout: () => void;
    onUpdateAvatar: (fileOrUrl: File | string) => Promise<boolean>;
}

export default function UserProfileModal({
    isOpen,
    onClose,
    user,
    onLogout,
    onUpdateAvatar,
}: UserProfileModalProps) {
    const [isEditingAvatar, setIsEditingAvatar] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleAvatarUrlSubmit = async () => {
        if (!avatarUrl.trim()) {
            setUploadError('请输入图片链接');
            return;
        }

        setIsUploading(true);
        setUploadError(null);

        try {
            const success = await onUpdateAvatar(avatarUrl.trim());
            if (success) {
                setUploadSuccess(true);
                setIsEditingAvatar(false);
                setAvatarUrl('');
                setTimeout(() => setUploadSuccess(false), 2000);
            } else {
                setUploadError('更新失败，请重试');
            }
        } catch (error) {
            setUploadError('网络错误，请稍后重试');
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadError(null);

        try {
            const success = await onUpdateAvatar(file);
            if (success) {
                setUploadSuccess(true);
                setTimeout(() => setUploadSuccess(false), 2000);
            } else {
                setUploadError('暂不支持文件上传，请使用图片链接');
            }
        } catch (error) {
            setUploadError('上传失败，请使用图片链接');
        } finally {
            setIsUploading(false);
        }
    };

    const getStatusBadge = () => {
        switch (user.status) {
            case 'VIP':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-white text-sm font-medium shadow-sm">
                        <Crown className="w-4 h-4" />
                        VIP 会员
                    </span>
                );
            case 'Active':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-fresh-green-400 to-fresh-green-500 text-white text-sm font-medium shadow-sm">
                        <Zap className="w-4 h-4" />
                        活跃用户
                    </span>
                );
            case 'Banned':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-red-400 to-red-500 text-white text-sm font-medium shadow-sm">
                        <Ban className="w-4 h-4" />
                        已封禁
                    </span>
                );
        }
    };

    const remaining = user.maxLimit - user.usedCount;
    const usagePercent = user.maxLimit > 0 ? (user.usedCount / user.maxLimit) * 100 : 0;

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
                    {/* 头部背景 */}
                    <div className="relative h-32 bg-gradient-to-br from-tender-blue-400 via-fresh-green-400 to-soft-pink-400">
                        {/* 关闭按钮 */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        {/* 装饰元素 */}
                        <div className="absolute inset-0 overflow-hidden">
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
                            <div className="absolute -bottom-20 -left-10 w-60 h-60 bg-white/10 rounded-full" />
                        </div>
                    </div>

                    {/* 头像区域 */}
                    <div className="relative -mt-16 flex justify-center">
                        <div className="relative group">
                            {/* 头像 */}
                            <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gradient-to-br from-tender-blue-100 to-fresh-green-100">
                                {user.avatarUrl ? (
                                    <img
                                        src={user.avatarUrl}
                                        alt={user.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-tender-blue-500">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>

                            {/* 编辑头像按钮 */}
                            <button
                                onClick={() => setIsEditingAvatar(!isEditingAvatar)}
                                className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center text-slate-600 hover:text-tender-blue-500 hover:scale-110 transition-all"
                                title="修改头像"
                            >
                                <Upload className="w-4 h-4" />
                            </button>

                            {uploadSuccess && (
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-fresh-green-500 text-white text-xs rounded-full flex items-center gap-1 animate-fade-in">
                                    <Check className="w-3 h-3" />
                                    已更新
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 头像编辑区域 */}
                    {isEditingAvatar && (
                        <div className="px-6 pt-4 animate-fade-in">
                            <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                                <p className="text-sm text-slate-600 font-medium">更换头像</p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={avatarUrl}
                                        onChange={(e) => setAvatarUrl(e.target.value)}
                                        placeholder="输入图片链接..."
                                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-tender-blue-400/50 focus:border-tender-blue-400"
                                    />
                                    <button
                                        onClick={handleAvatarUrlSubmit}
                                        disabled={isUploading}
                                        className="px-4 py-2 bg-tender-blue-500 text-white rounded-lg text-sm font-medium hover:bg-tender-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                                    >
                                        {isUploading ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Link2 className="w-4 h-4" />
                                                确定
                                            </>
                                        )}
                                    </button>
                                </div>
                                {uploadError && (
                                    <p className="text-xs text-red-500 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        {uploadError}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 用户信息 */}
                    <div className="px-6 pt-4 pb-2 text-center">
                        <h2 className="text-2xl font-bold text-slate-800">{user.name}</h2>
                        <div className="mt-2">{getStatusBadge()}</div>
                    </div>

                    {/* 详细信息 */}
                    <div className="px-6 py-4 space-y-4">
                        {/* 用户ID */}
                        <div className="flex items-center justify-between py-3 border-b border-slate-100">
                            <span className="text-slate-500 text-sm">用户 ID</span>
                            <span className="text-slate-700 text-sm font-mono bg-slate-100 px-2 py-1 rounded">
                                {user.id.substring(0, 8)}...
                            </span>
                        </div>

                        {/* 使用次数 */}
                        <div className="py-3 border-b border-slate-100">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-slate-500 text-sm">使用配额</span>
                                <span className="text-slate-700 text-sm font-medium">
                                    {user.status === 'VIP' ? (
                                        <span className="text-amber-500">无限制</span>
                                    ) : (
                                        <>
                                            <span className="text-tender-blue-500">{user.usedCount}</span>
                                            <span className="text-slate-400"> / </span>
                                            <span>{user.maxLimit}</span>
                                        </>
                                    )}
                                </span>
                            </div>

                            {user.status !== 'VIP' && (
                                <>
                                    {/* 进度条 */}
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${usagePercent >= 90
                                                    ? 'bg-gradient-to-r from-red-400 to-red-500'
                                                    : usagePercent >= 70
                                                        ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                                                        : 'bg-gradient-to-r from-tender-blue-400 to-fresh-green-400'
                                                }`}
                                            style={{ width: `${usagePercent}%` }}
                                        />
                                    </div>

                                    {/* 剩余次数提示 */}
                                    <p className="mt-2 text-xs text-slate-400 text-right">
                                        剩余 <span className={remaining <= 2 ? 'text-red-500 font-medium' : 'text-fresh-green-500 font-medium'}>{remaining}</span> 次
                                    </p>
                                </>
                            )}
                        </div>

                        {/* 统计信息 */}
                        <div className="grid grid-cols-2 gap-4 py-2">
                            <div className="text-center p-3 bg-tender-blue-50 rounded-xl">
                                <p className="text-2xl font-bold text-tender-blue-600">{user.maxLimit}</p>
                                <p className="text-xs text-slate-500 mt-1">总次数</p>
                            </div>
                            <div className="text-center p-3 bg-soft-pink-50 rounded-xl">
                                <p className="text-2xl font-bold text-soft-pink-600">{user.usedCount}</p>
                                <p className="text-xs text-slate-500 mt-1">已使用</p>
                            </div>
                        </div>
                    </div>

                    {/* 退出登录按钮 */}
                    <div className="px-6 pb-6">
                        <button
                            onClick={() => {
                                onLogout();
                                onClose();
                            }}
                            className="w-full py-3 rounded-xl border-2 border-red-200 text-red-500 font-medium hover:bg-red-50 hover:border-red-300 transition-all flex items-center justify-center gap-2"
                        >
                            <LogOut className="w-4 h-4" />
                            退出登录
                        </button>
                    </div>
                </div>
            </div>

            {/* 隐藏的文件输入 */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
            />
        </div>
    );
}

