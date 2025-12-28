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
    const [uploadStatus, setUploadStatus] = useState<string>(''); // 上传状态提示：如 "正在获取上传凭证..."、"正在上传到云端..." 等
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
        setUploadSuccess(false);
        setUploadStatus('正在更新头像...');

        try {
            const success = await onUpdateAvatar(avatarUrl.trim());
            if (success) {
                setUploadStatus('更新成功！');
                setUploadSuccess(true);
                setIsEditingAvatar(false);
                setAvatarUrl('');
                setIsUploading(false);
                setTimeout(() => {
                    setUploadSuccess(false);
                    setUploadStatus('');
                }, 3000);
            } else {
                throw new Error('更新失败，请重试');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '网络错误，请稍后重试';
            setUploadError(errorMessage);
            setUploadStatus('');
            setIsUploading(false);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        console.log('文件选择触发');
        const file = e.target.files?.[0];
        if (!file) {
            console.log('未选择文件');
            return;
        }

        console.log('选择的文件:', {
            name: file.name,
            type: file.type,
            size: file.size,
        });

        setUploadError(null); // 清除之前的错误

        // 文件大小校验（5MB）
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            const errorMsg = `文件大小不能超过 5MB，当前文件大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`;
            console.error(errorMsg);
            setUploadError(errorMsg);
            return;
        }

        // 文件类型校验
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            const errorMsg = `仅支持 JPG、PNG、WEBP 格式，当前格式: ${file.type}`;
            console.error(errorMsg);
            setUploadError(errorMsg);
            return;
        }

        console.log('文件验证通过，开始读取...');

        // 读取文件并显示裁剪界面
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageSrc = e.target?.result as string;
            if (!imageSrc) {
                console.error('文件读取结果为空');
                setUploadError('文件读取失败：结果为空');
                return;
            }
            console.log('文件读取成功，显示裁剪界面');
            setSelectedImageSrc(imageSrc);
            setShowCropModal(true);
            setIsEditingAvatar(false);
        };
        reader.onerror = (error) => {
            console.error('文件读取失败:', error);
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
        setUploadSuccess(false);
        setUploadStatus('正在准备上传...');

        try {
            console.log('开始上传头像流程...');
            
            // Step 1: 获取上传凭证
            setUploadStatus('正在获取上传凭证...');
            console.log('Step 1: 请求上传凭证...');
            const signResponse = await fetch('/api/auth/avatar/sign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    fileName: `avatar-${Date.now()}.jpg`,
                    contentType: 'image/jpeg',
                }),
            });

            if (!signResponse.ok) {
                const errorText = await signResponse.text();
                let errorMsg = `获取上传凭证失败 (${signResponse.status})`;
                try {
                    const errorData = JSON.parse(errorText);
                    if (errorData.msg) {
                        errorMsg = errorData.msg;
                    }
                } catch (e) {
                    // 解析失败，使用默认消息
                }
                console.error('获取上传凭证失败:', signResponse.status, errorText);
                throw new Error(errorMsg);
            }

            const signData = await signResponse.json();
            console.log('上传凭证响应:', signData);

            if (!signData.success || !signData.uploadUrl || !signData.publicUrl) {
                console.error('上传凭证数据不完整:', signData);
                throw new Error(signData.msg || '获取上传凭证失败：服务器响应异常，请稍后重试');
            }

            // Step 2: 直接上传到 OSS
            setUploadStatus('正在上传图片到云端存储...');
            console.log('Step 2: 上传文件到 OSS...', signData.uploadUrl);
            try {
                const uploadResponse = await fetch(signData.uploadUrl, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'image/jpeg',
                    },
                    body: croppedImageBlob,
                });

                if (!uploadResponse.ok) {
                    const errorText = await uploadResponse.text();
                    console.error('上传到 OSS 失败:', uploadResponse.status, errorText);
                    throw new Error(`上传到云端存储失败 (${uploadResponse.status})`);
                }
                console.log('文件上传成功');
            } catch (uploadError) {
                // 检查是否是 CORS 错误
                if (uploadError instanceof TypeError || uploadError instanceof Error) {
                    const errorMessage = uploadError.message || String(uploadError);
                    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Load failed') || errorMessage.includes('access control checks')) {
                        console.error('CORS 错误：OSS bucket 可能未正确配置 CORS 规则');
                        throw new Error('上传失败：浏览器安全限制。请联系管理员检查 OSS 存储配置。');
                    }
                    if (errorMessage.includes('network') || errorMessage.includes('Network')) {
                        throw new Error('上传失败：网络连接异常，请检查网络后重试');
                    }
                }
                throw uploadError;
            }

            // Step 3: 同步到 Notion
            setUploadStatus('正在同步到数据库...');
            console.log('Step 3: 同步到 Notion...', signData.publicUrl);
            const syncResponse = await fetch('/api/auth/avatar/update-notion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    publicUrl: signData.publicUrl,
                }),
            });

            if (!syncResponse.ok) {
                const errorText = await syncResponse.text();
                let errorMsg = `同步到数据库失败 (${syncResponse.status})`;
                try {
                    const errorData = JSON.parse(errorText);
                    if (errorData.msg) {
                        errorMsg = errorData.msg;
                    }
                } catch (e) {
                    // 解析失败，使用默认消息
                }
                console.error('同步到 Notion 失败:', syncResponse.status, errorText);
                throw new Error(errorMsg);
            }

            const syncData = await syncResponse.json();
            console.log('Notion 同步响应:', syncData);

            if (!syncData.success) {
                throw new Error(syncData.msg || '同步到数据库失败，请重试');
            }

            // 更新本地缓存
            setUploadStatus('正在更新本地信息...');
            console.log('更新本地缓存...');
            const success = await onUpdateAvatar(signData.publicUrl);
            if (success) {
                console.log('头像更新成功');
                setUploadStatus('上传成功！');
                setUploadSuccess(true);
                setIsUploading(false);
                // 3 秒后清除成功提示和状态
                setTimeout(() => {
                    setUploadSuccess(false);
                    setUploadStatus('');
                }, 3000);
            } else {
                throw new Error('更新本地缓存失败，请刷新页面查看最新头像');
            }
        } catch (error) {
            console.error('上传头像错误:', error);
            let errorMessage = '上传失败，请重试';
            
            if (error instanceof Error) {
                errorMessage = error.message;
                // 根据不同的错误类型提供更友好的提示
                if (errorMessage.includes('网络') || errorMessage.includes('Network') || errorMessage.includes('fetch')) {
                    errorMessage = '网络连接失败，请检查网络后重试';
                } else if (errorMessage.includes('CORS') || errorMessage.includes('跨域') || errorMessage.includes('浏览器安全')) {
                    errorMessage = '上传失败：服务器配置问题，请联系管理员';
                } else if (errorMessage.includes('数据库') || errorMessage.includes('Notion') || errorMessage.includes('同步')) {
                    errorMessage = '头像已上传，但保存失败，请稍后重试或联系管理员';
                } else if (errorMessage.includes('凭证') || errorMessage.includes('配置')) {
                    errorMessage = '服务器配置错误，请联系管理员';
                }
            }
            
            setUploadError(errorMessage);
            setUploadStatus('');
            setIsUploading(false);
            console.error('错误详情:', {
                message: errorMessage,
                originalError: error,
                stack: error instanceof Error ? error.stack : undefined,
            });
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
                                    setUploadStatus('');
                                }}
                                disabled={isUploading}
                                className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center text-slate-600 hover:text-tender-blue-500 hover:scale-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                title="修改头像"
                            >
                                <Upload className="w-4 h-4" />
                            </button>

                            {/* 上传中的覆盖层 */}
                            {isUploading && (
                                <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                    <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
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
                                        onClick={() => {
                                            console.log('点击选择文件按钮');
                                            if (fileInputRef.current) {
                                                console.log('触发文件选择器');
                                                fileInputRef.current.click();
                                            } else {
                                                console.error('fileInputRef.current 为空');
                                            }
                                        }}
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
                                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none"
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
                                {/* 上传状态提示 */}
                                {isUploading && uploadStatus && (
                                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                                            <p className="text-sm text-blue-700 font-medium">{uploadStatus}</p>
                                        </div>
                                    </div>
                                )}
                                
                                {/* 错误提示 */}
                                {uploadError && !isUploading && (
                                    <div className="p-3 bg-red-50 border-2 border-red-300 rounded-lg animate-fade-in">
                                        <div className="flex items-start gap-3">
                                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-red-700 mb-1">上传失败</p>
                                                <p className="text-sm text-red-600">{uploadError}</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setUploadError(null);
                                                    setIsEditingAvatar(false);
                                                }}
                                                className="text-red-400 hover:text-red-600 transition-colors"
                                                aria-label="关闭错误提示"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                                
                                {/* 成功提示 */}
                                {uploadSuccess && !isUploading && (
                                    <div className="p-3 bg-green-50 border-2 border-green-300 rounded-lg animate-fade-in">
                                        <div className="flex items-center gap-3">
                                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                            <p className="text-sm font-medium text-green-700">头像上传成功！</p>
                                        </div>
                                    </div>
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
                                        className="flex-1 max-w-xs px-4 py-2 bg-white border-2 border-tender-blue-400 rounded-xl text-xl font-bold text-slate-800 focus:outline-none"
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

