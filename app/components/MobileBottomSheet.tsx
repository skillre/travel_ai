'use client';

import { useRef, useState, useCallback, ReactNode, useEffect } from 'react';

// 抽屉状态 - 简化为两个状态
type SheetState = 'collapsed' | 'expanded';

// 高度配置 (vh)
const SHEET_HEIGHTS: Record<SheetState, number> = {
    collapsed: 40,  // 约 40% - 显示一些卡片预览
    expanded: 88,   // 约 88% - 展开显示更多内容
};

// 最小拖拽距离触发切换 (px)
const DRAG_THRESHOLD = 50;

interface MobileBottomSheetProps {
    children: ReactNode;
}

export default function MobileBottomSheet({ children }: MobileBottomSheetProps) {
    const [sheetState, setSheetState] = useState<SheetState>('collapsed');
    const [isDragging, setIsDragging] = useState(false);
    const [translateY, setTranslateY] = useState(0);

    const handleRef = useRef<HTMLDivElement>(null);
    const startYRef = useRef(0);
    const lastYRef = useRef(0);

    // 锁定背景滚动
    useEffect(() => {
        // 禁止 body 滚动
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
        const touch = e.touches[0];
        startYRef.current = touch.clientY;
        lastYRef.current = touch.clientY;
        setIsDragging(true);
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isDragging) return;

        e.preventDefault(); // 阻止默认滚动行为

        const touch = e.touches[0];
        const deltaY = touch.clientY - startYRef.current;
        lastYRef.current = touch.clientY;

        // 限制拖拽范围
        const maxDrag = window.innerHeight * 0.5;
        const limitedDelta = Math.max(-maxDrag, Math.min(maxDrag, deltaY));
        setTranslateY(limitedDelta);
    }, [isDragging]);

    const handleTouchEnd = useCallback(() => {
        if (!isDragging) return;

        // 根据拖拽距离决定目标状态
        if (sheetState === 'collapsed') {
            // 当前是折叠状态，向上拖超过阈值则展开
            if (translateY < -DRAG_THRESHOLD) {
                setSheetState('expanded');
            }
        } else {
            // 当前是展开状态，向下拖超过阈值则折叠
            if (translateY > DRAG_THRESHOLD) {
                setSheetState('collapsed');
            }
        }

        setIsDragging(false);
        setTranslateY(0);
    }, [isDragging, sheetState, translateY]);

    // Handle 点击切换
    const handleHandleClick = useCallback(() => {
        setSheetState(prev => prev === 'collapsed' ? 'expanded' : 'collapsed');
    }, []);

    // 计算实际高度
    const baseHeightVh = SHEET_HEIGHTS[sheetState];
    const dragOffsetVh = isDragging ? (-translateY / window.innerHeight) * 100 : 0;
    const finalHeightVh = Math.max(35, Math.min(92, baseHeightVh + dragOffsetVh));

    // 阻止内容区域的触摸事件传播到 sheet
    const handleContentTouchStart = useCallback((e: React.TouchEvent) => {
        e.stopPropagation();
    }, []);

    return (
        <div
            className={`
                fixed bottom-0 left-0 right-0 z-50
                bg-white rounded-t-[24px] shadow-2xl
                flex flex-col
                ${isDragging ? '' : 'transition-[height] duration-300 ease-out'}
            `}
            style={{
                height: `${finalHeightVh}vh`,
                boxShadow: '0 -8px 30px rgba(0, 0, 0, 0.12)',
            }}
        >
            {/* Handle 拖拽区域 - 只有这里响应拖拽 */}
            <div
                ref={handleRef}
                className="shrink-0 flex flex-col items-center py-3 cursor-grab active:cursor-grabbing touch-none"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={handleHandleClick}
            >
                <div className="w-10 h-1.5 bg-slate-300 rounded-full" />
            </div>

            {/* 内容区域 - 独立滚动，不影响拖拽 */}
            <div
                className="flex-1 overflow-y-auto overscroll-contain"
                onTouchStart={handleContentTouchStart}
                style={{
                    WebkitOverflowScrolling: 'touch',
                    touchAction: 'pan-y',
                }}
            >
                {children}
            </div>

            {/* 底部安全区域 */}
            <div className="shrink-0 safe-area-bottom" />
        </div>
    );
}
