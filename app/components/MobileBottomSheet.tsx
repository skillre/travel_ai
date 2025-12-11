'use client';

import { useRef, useState, useCallback, ReactNode, useEffect } from 'react';
import { MapPin } from 'lucide-react';

// 抽屉状态
type SheetState = 'hidden' | 'collapsed' | 'expanded';

// 高度配置 (vh)
const SHEET_HEIGHTS: Record<SheetState, number> = {
    hidden: 0,      // 隐藏模式下高度不通过 vh 控制，而是 CSS 固定
    collapsed: 40,  // 约 40%
    expanded: 88,   // 约 88%
};

// 最小拖拽距离触发切换 (px)
const DRAG_THRESHOLD = 30;

interface MobileBottomSheetProps {
    children: ReactNode;
    title?: string; // 胶囊模式显示的标题
}

export default function MobileBottomSheet({ children, title = '行程列表' }: MobileBottomSheetProps) {
    const [sheetState, setSheetState] = useState<SheetState>('collapsed');
    const [isDragging, setIsDragging] = useState(false);
    const [translateY, setTranslateY] = useState(0);

    const handleRef = useRef<HTMLDivElement>(null);
    const startYRef = useRef(0);
    const lastYRef = useRef(0);

    // 锁定背景滚动
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.body.style.height = '100%';

        return () => {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
            document.body.style.height = '';
        };
    }, []);

    // 只在 Handle 区域处理拖拽
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (sheetState === 'hidden') return;
        const touch = e.touches[0];
        startYRef.current = touch.clientY;
        lastYRef.current = touch.clientY;
        setIsDragging(true);
    }, [sheetState]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isDragging || sheetState === 'hidden') return;

        e.preventDefault();

        const touch = e.touches[0];
        const deltaY = touch.clientY - startYRef.current;
        lastYRef.current = touch.clientY;

        setTranslateY(deltaY);
    }, [isDragging, sheetState]);

    const handleTouchEnd = useCallback(() => {
        if (!isDragging || sheetState === 'hidden') return;

        if (sheetState === 'collapsed') {
            if (translateY < -DRAG_THRESHOLD) {
                setSheetState('expanded');
            } else if (translateY > DRAG_THRESHOLD) {
                setSheetState('hidden');
            }
        } else if (sheetState === 'expanded') {
            if (translateY > DRAG_THRESHOLD) {
                setSheetState('collapsed');
            }
        }

        setIsDragging(false);
        setTranslateY(0);
    }, [isDragging, sheetState, translateY]);

    const handleHandleClick = useCallback(() => {
        setSheetState(prev => {
            if (prev === 'hidden') return 'collapsed';
            if (prev === 'collapsed') return 'expanded';
            return 'collapsed';
        });
    }, []);

    // 计算样式
    const isHidden = sheetState === 'hidden';
    const baseHeightVh = SHEET_HEIGHTS[sheetState];
    const dragOffsetVh = isDragging ? (-translateY / window.innerHeight) * 100 : 0;
    const finalHeightVh = isHidden ? 0 : Math.max(10, Math.min(95, baseHeightVh + dragOffsetVh));

    // 阻止内容区域的触摸事件传播
    const handleContentTouchStart = useCallback((e: React.TouchEvent) => {
        e.stopPropagation();
    }, []);

    return (
        <div
            className={`
                fixed z-50 bg-white shadow-2xl flex flex-col
                transition-all duration-300 ease-in-out
                ${isHidden
                    ? 'bottom-4 left-1/2 -translate-x-1/2 w-40 h-10 rounded-full cursor-pointer hover:scale-105 active:scale-95'
                    : 'bottom-0 left-0 right-0 rounded-t-[24px]'
                }
            `}
            style={{
                height: isHidden ? '40px' : `${finalHeightVh}vh`,
                boxShadow: isHidden
                    ? '0 4px 20px rgba(0,0,0,0.15)'
                    : '0 -8px 30px rgba(0, 0, 0, 0.12)',
            }}
            onClick={isHidden ? handleHandleClick : undefined}
        >
            {/* 胶囊内容 (Hidden State) */}
            <div
                className={`
                    absolute inset-0 flex items-center justify-center gap-2
                    transition-opacity duration-300
                    ${isHidden ? 'opacity-100' : 'opacity-0 pointer-events-none'}
                `}
            >
                <div className="w-10 h-1 bg-slate-200 rounded-full absolute top-2 left-1/2 -translate-x-1/2 opacity-0" />
                <MapPin className="w-4 h-4 text-teal-500" />
                <span className="text-sm font-bold text-slate-700 truncate max-w-[100px]">{title}</span>
            </div>

            {/* 正常内容 (Sheet State) */}
            <div
                className={`
                    flex flex-col h-full w-full
                    transition-opacity duration-300
                    ${isHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}
                `}
            >
                {/* Handle */}
                <div
                    ref={handleRef}
                    className="shrink-0 flex flex-col items-center pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onClick={handleHandleClick}
                >
                    <div className="w-8 h-1 bg-slate-300 rounded-full mb-1" />
                </div>

                {/* Content */}
                <div
                    className="flex-1 overflow-y-auto overscroll-contain px-1"
                    onTouchStart={handleContentTouchStart}
                    style={{
                        WebkitOverflowScrolling: 'touch',
                        touchAction: 'pan-y',
                    }}
                >
                    {children}
                </div>
            </div>

            {/* 底部安全区域 (只在展开时显示) */}
            {!isHidden && <div className="shrink-0 safe-area-bottom" />}
        </div>
    );
}
