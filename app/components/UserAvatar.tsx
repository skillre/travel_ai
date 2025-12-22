'use client';

import { useState } from 'react';
import { User } from 'lucide-react';
import { UserInfo } from '../types';

interface UserAvatarProps {
    user: UserInfo | null;
    onClick?: () => void;
    size?: 'sm' | 'md' | 'lg';
}

export default function UserAvatar({ user, onClick, size = 'md' }: UserAvatarProps) {
    const [imageError, setImageError] = useState(false);

    const sizeClasses = {
        sm: 'w-8 h-8 text-sm',
        md: 'w-10 h-10 text-base',
        lg: 'w-14 h-14 text-lg',
    };

    const iconSizes = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-7 h-7',
    };

    // 如果没有用户，显示登录提示
    if (!user) {
        return (
            <button
                onClick={onClick}
                className={`
                    ${sizeClasses[size]} rounded-full
                    bg-gradient-to-br from-slate-100 to-slate-200
                    border-2 border-white/60 shadow-sm
                    flex items-center justify-center
                    hover:scale-105 hover:shadow-md
                    transition-all duration-200
                    text-slate-400
                `}
                title="点击登录"
            >
                <User className={iconSizes[size]} />
            </button>
        );
    }

    // 有头像且加载成功
    if (user.avatarUrl && !imageError) {
        return (
            <button
                onClick={onClick}
                className={`
                    ${sizeClasses[size]} rounded-full
                    border-2 border-white/80 shadow-md
                    overflow-hidden
                    hover:scale-105 hover:shadow-lg hover:border-tender-blue-300
                    transition-all duration-200
                    ring-2 ring-tender-blue-100/50
                `}
                title={user.name}
            >
                <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                />
            </button>
        );
    }

    // 无头像或加载失败，显示首字母
    const initial = user.name.charAt(0).toUpperCase();
    const bgColors = [
        'from-tender-blue-400 to-tender-blue-500',
        'from-fresh-green-400 to-fresh-green-500',
        'from-soft-pink-400 to-soft-pink-500',
        'from-amber-400 to-amber-500',
        'from-violet-400 to-violet-500',
    ];
    // 根据用户名生成一个稳定的颜色
    const colorIndex = user.name.charCodeAt(0) % bgColors.length;

    return (
        <button
            onClick={onClick}
            className={`
                ${sizeClasses[size]} rounded-full
                bg-gradient-to-br ${bgColors[colorIndex]}
                border-2 border-white/80 shadow-md
                flex items-center justify-center
                text-white font-bold
                hover:scale-105 hover:shadow-lg
                transition-all duration-200
                ring-2 ring-white/30
            `}
            title={user.name}
        >
            {initial}
        </button>
    );
}

