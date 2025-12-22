'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { UserInfo, UserContextType, LoginResponse } from '../types';

const USER_STORAGE_KEY = 'travel_ai_user';
const CODE_STORAGE_KEY = 'travel_ai_code';

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // 初始化：从 localStorage 恢复用户状态
    useEffect(() => {
        const initUser = async () => {
            if (typeof window === 'undefined') return;

            const savedCode = localStorage.getItem(CODE_STORAGE_KEY);
            if (savedCode) {
                try {
                    // 用保存的 code 重新获取用户信息
                    const response = await fetch('/api/auth/user', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code: savedCode }),
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.success && data.user) {
                            setUser(data.user);
                        } else {
                            // code 无效，清除存储
                            localStorage.removeItem(CODE_STORAGE_KEY);
                            localStorage.removeItem(USER_STORAGE_KEY);
                        }
                    }
                } catch (error) {
                    console.error('Failed to restore user session:', error);
                }
            }
            setIsLoading(false);
        };

        initUser();
    }, []);

    // 登录
    const login = useCallback(async (code: string): Promise<LoginResponse> => {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: code.trim() }),
            });

            const data: LoginResponse = await response.json();

            if (data.success && data.user) {
                setUser(data.user);
                // 保存 code 和用户信息
                localStorage.setItem(CODE_STORAGE_KEY, code.trim());
                localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
            }

            return data;
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, msg: '网络错误，请稍后重试' };
        }
    }, []);

    // 登出
    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem(CODE_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
        // 同时清除旧的解锁状态
        localStorage.removeItem('is_unlocked');
    }, []);

    // 刷新用户信息
    const refreshUser = useCallback(async () => {
        const savedCode = localStorage.getItem(CODE_STORAGE_KEY);
        if (!savedCode) return;

        try {
            const response = await fetch('/api/auth/user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: savedCode }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.user) {
                    setUser(data.user);
                    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
                }
            }
        } catch (error) {
            console.error('Failed to refresh user:', error);
        }
    }, []);

    // 更新头像
    const updateAvatar = useCallback(async (fileOrUrl: File | string): Promise<boolean> => {
        if (!user) return false;

        try {
            const formData = new FormData();
            formData.append('userId', user.id);

            if (typeof fileOrUrl === 'string') {
                // URL 方式
                formData.append('avatarUrl', fileOrUrl);
            } else {
                // 文件上传方式
                formData.append('avatar', fileOrUrl);
            }

            const response = await fetch('/api/auth/avatar', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // 更新本地用户信息
                    setUser(prev => prev ? { ...prev, avatarUrl: data.avatarUrl } : null);
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('Failed to update avatar:', error);
            return false;
        }
    }, [user]);

    return (
        <UserContext.Provider value={{ user, isLoading, login, logout, refreshUser, updateAvatar }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}

