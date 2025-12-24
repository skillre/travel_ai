'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Crown, Zap, Ban, LogOut, Link2, Upload, Check, AlertCircle, Copy, CheckCircle, Edit2 } from 'lucide-react';
import { UserInfo } from '../types';
import AvatarCropModal from './AvatarCropModal';

interface UserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: UserInfo;
    onLogout: () => void;
    onUpdateAvatar: (fileOrUrl: File | string) => Promise<boolean>;
    onUpdateUserName: (newName: string) => Promise<{ success: boolean; msg?: string }>;
}

export default function UserProfileModal({
    isOpen,
    onClose,
    user,
    onLogout,
    onUpdateAvatar,
    onUpdateUserName,
}: UserProfileModalProps) {
    const [isEditingAvatar, setIsEditingAvatar] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [userName, setUserName] = useState(user.name);
    const [avatarUrl, setAvatarUrl] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [nameUpdateError, setNameUpdateError] = useState<string | null>(null);
    const [nameUpdateSuccess, setNameUpdateSuccess] = useState(false);
    const [isUpdatingName, setIsUpdatingName] = useState(false);
    const [showCropModal, setShowCropModal] = useState(false);
    const [selectedImageSrc, setSelectedImageSrc] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 同步用户名状态
    useEffect(() => {
        setUserName(user.name);
    }, [user.name]);

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

        // 文件大小校验（5MB）
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            setUploadError('文件大小不能超过 5MB');
            return;
        }

        // 文件类型校验
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            setUploadError('仅支持 JPG、PNG、WEBP 格式');
            return;
        }

        // 读取文件并显示裁剪界面
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageSrc = e.target?.result as string;
            setSelectedImageSrc(imageSrc);
            setShowCropModal(true);
            setIsEditingAvatar(false);
        };
        reader.onerror = () => {
            setUploadError('文件读取失败');
        };
        reader.readAsDataURL(file);

        // 重置文件输入
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // 处理裁剪完成后的上传
    const handleCropComplete = async (croppedImageBlob: Blob) => {
        setShowCropModal(false);
        setIsUploading(true);
        setUploadError(null);

        try {
            // Step 1: 获取上传凭证
            const signResponse = await fetch('/api/auth/avatar/sign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    fileName: `avatar-${Date.now()}.jpg`,
                    contentType: 'image/jpeg',
                }),
            });

            const signData = await signResponse.json();

            if (!signData.success || !signData.uploadUrl || !signData.publicUrl) {
                throw new Error(signData.msg || '获取上传凭证失败');
            }

            // Step 2: 直接上传到 R2
            const uploadResponse = await fetch(signData.uploadUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'image/jpeg',
                },
                body: croppedImageBlob,
            });

            if (!uploadResponse.ok) {
                throw new Error('上传到云存储失败');
            }

            // Step 3: 同步到 Notion
            const syncResponse = await fetch('/api/auth/avatar/update-notion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    publicUrl: signData.publicUrl,
                }),
            });

            const syncData = await syncResponse.json();

            if (!syncData.success) {
                throw new Error(syncData.msg || '同步到数据库失败');
            }

            // 更新本地缓存
            const success = await onUpdateAvatar(signData.publicUrl);
            if (success) {
                setUploadSuccess(true);
                setTimeout(() => setUploadSuccess(false), 2000);
            }
        } catch (error) {
            console.error('Upload avatar error:', error);
            setUploadError(error instanceof Error ? error.message : '上传失败，请重试');
        } finally {
            setIsUploading(false);
        }
    };

    // 处理用户名更新
    const handleUserNameSave = async () => {
        if (!userName.trim()) {
            setNameUpdateError('用户名不能为空');
            return;
        }

        if (userName.trim() === user.name) {
            setIsEditingName(false);
            return;
        }

        setIsUpdatingName(true);
        setNameUpdateError(null);

        try {
            const result = await onUpdateUserName(userName.trim());
            if (result.success) {
                setNameUpdateSuccess(true);
                setIsEditingName(false);
                setTimeout(() => setNameUpdateSuccess(false), 2000);
            } else {
                setNameUpdateError(result.msg || '更新失败，请重试');
            }
        } catch (error) {
            setNameUpdateError('网络错误，请稍后重试');
        } finally {
            setIsUpdatingName(false);
        }
    };

    // 复制用户ID到剪贴板
    const handleCopyUserId = async () => {
        try {
            await navigator.clipboard.writeText(user.id);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
            // 降级方案：使用传统方法
            const textArea = document.createElement('textarea');
            textArea.value = user.id;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                setCopySuccess(true);
                setTimeout(() => setCopySuccess(false), 2000);
            } catch (err) {
                console.error('Fallback copy failed:', err);
            }
            document.body.removeChild(textArea);
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
            <div 
                className="relative z-10 w-full max-w-md mx-4 animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                    {/* 头部背景 */}
                    <div className="relative h-32 bg-gradient-to-br from-tender-blue-400 via-fresh-green-400 to-soft-pink-400">
                        {/* 装饰元素 */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
                            <div className="absolute -bottom-20 -left-10 w-60 h-60 bg-white/10 rounded-full" />
                        </div>

                        {/* 关闭按钮 - 提高z-index确保可点击 */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                            }}
                            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors z-50"
                            aria-label="关闭"
                        >
                            <X className="w-4 h-4" />
                        </button>
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
                                onClick={() => {
                                    setIsEditingAvatar(!isEditingAvatar);
                                    setUploadError(null);
                                }}
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
                                <div className="flex flex-col gap-3">
                                    {/* 文件上传按钮 */}
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                        className="w-full py-2.5 px-4 bg-white border-2 border-dashed border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:border-tender-blue-400 hover:text-tender-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Upload className="w-4 h-4" />
                                        选择图片 (JPG/PNG/WEBP, 最大 5MB)
                                    </button>

                                    {/* URL 输入方式（保留作为备用） */}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={avatarUrl}
                                        onChange={(e) => setAvatarUrl(e.target.value)}
                                            placeholder="或输入图片链接..."
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
                                </div>
                                {uploadError && (
                                    <p className="text-xs text-red-500 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        {uploadError}
                                    </p>
                                )}
                                {isUploading && (
                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                        <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                                        上传中...
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 用户信息 */}
                    <div className="px-6 pt-4 pb-2">
                        <div className="flex flex-col items-center gap-2">
                            {isEditingName ? (
                                <div className="w-full flex items-center justify-center gap-2">
                                    <input
                                        type="text"
                                        value={userName}
                                        onChange={(e) => setUserName(e.target.value)}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                handleUserNameSave();
                                            } else if (e.key === 'Escape') {
                                                setUserName(user.name);
                                                setIsEditingName(false);
                                                setNameUpdateError(null);
                                            }
                                        }}
                                        className="flex-1 max-w-xs px-4 py-2 bg-white border-2 border-tender-blue-400 rounded-xl text-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-tender-blue-400/50"
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleUserNameSave}
                                        disabled={isUpdatingName}
                                        className="w-10 h-10 rounded-xl bg-tender-blue-500 text-white hover:bg-tender-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center shadow-md"
                                        title="保存"
                                    >
                                        {isUpdatingName ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <Check className="w-5 h-5" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setUserName(user.name);
                                            setIsEditingName(false);
                                            setNameUpdateError(null);
                                        }}
                                        className="w-10 h-10 rounded-xl bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors flex items-center justify-center shadow-md"
                                        title="取消"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2">
                        <h2 className="text-2xl font-bold text-slate-800">{user.name}</h2>
                                    <button
                                        onClick={() => setIsEditingName(true)}
                                        className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-tender-blue-500 transition-colors flex items-center justify-center"
                                        title="编辑用户名"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>
                        {nameUpdateError && (
                            <p className="mt-2 text-xs text-red-500 flex items-center justify-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {nameUpdateError}
                            </p>
                        )}
                        {nameUpdateSuccess && (
                            <p className="mt-2 text-xs text-fresh-green-500 flex items-center justify-center gap-1">
                                <Check className="w-3 h-3" />
                                用户名已更新
                            </p>
                        )}
                        <div className="mt-2">{getStatusBadge()}</div>
                    </div>

                    {/* 详细信息 */}
                    <div className="px-6 py-4 space-y-4">
                        {/* 用户ID */}
                        <div className="flex items-center justify-between py-3 border-b border-slate-100">
                            <span className="text-slate-500 text-sm">用户 ID</span>
                            <button
                                onClick={handleCopyUserId}
                                className="flex items-center gap-2 text-slate-700 text-sm font-mono bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded transition-colors group relative"
                                title="点击复制"
                            >
                                <span>{user.id.substring(0, 8)}...</span>
                                {copySuccess ? (
                                    <CheckCircle className="w-4 h-4 text-fresh-green-500" />
                                ) : (
                                    <Copy className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                                )}
                                {/* 复制成功提示 */}
                                {copySuccess && (
                                    <span className="absolute -top-8 right-0 px-2 py-1 bg-slate-800 text-white text-xs rounded whitespace-nowrap animate-fade-in">
                                        已复制
                                    </span>
                                )}
                            </button>
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
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
            />

            {/* 头像裁剪模态框 */}
            {showCropModal && selectedImageSrc && (
                <AvatarCropModal
                    isOpen={showCropModal}
                    imageSrc={selectedImageSrc}
                    onClose={() => {
                        setShowCropModal(false);
                        setSelectedImageSrc('');
                    }}
                    onCropComplete={handleCropComplete}
                />
            )}
        </div>
    );
}

