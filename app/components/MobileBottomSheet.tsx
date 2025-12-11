'use client';

import { useRef, useState, useCallback, useEffect, ReactNode } from 'react';

// 抽屉状态
type SheetState = 'collapsed' | 'half' | 'expanded';

// 高度配置 (vh)
const SHEET_HEIGHTS: Record<SheetState, number> = {
    collapsed: 38,  // 约 38% - 显示 Header + 一个卡片预览
    half: 60,       // 约 60% - 中间状态
    expanded: 92,   // 约 92% - 几乎全屏，留出顶部空间看地图
};

// 速度阈值 (px/ms) - 快速滑动触发状态切换
const VELOCITY_THRESHOLD = 0.5;

interface MobileBottomSheetProps {
    children: ReactNode;
    headerContent?: ReactNode;
    onStateChange?: (state: SheetState) => void;
}

export default function MobileBottomSheet({
    children,
    headerContent,
    onStateChange,
}: MobileBottomSheetProps) {
    const [sheetState, setSheetState] = useState<SheetState>('collapsed');
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);

    const sheetRef = useRef<HTMLDivElement>(null);
    const startYRef = useRef(0);
    const startTimeRef = useRef(0);
    const currentHeightRef = useRef(SHEET_HEIGHTS.collapsed);

    // 计算当前高度
    const getCurrentHeight = useCallback(() => {
        return SHEET_HEIGHTS[sheetState];
    }, [sheetState]);

    // 更新状态
    const updateState = useCallback((newState: SheetState) => {
        setSheetState(newState);
        currentHeightRef.current = SHEET_HEIGHTS[newState];
        onStateChange?.(newState);
    }, [onStateChange]);

    // 根据位置和速度判断目标状态
    const determineTargetState = useCallback((
        currentPosition: number,
        velocity: number
    ): SheetState => {
        const windowHeight = window.innerHeight;
        const currentHeightVh = (currentPosition / windowHeight) * 100;

        // 快速向上滑动
        if (velocity < -VELOCITY_THRESHOLD) {
            if (sheetState === 'collapsed') return 'half';
            return 'expanded';
        }

        // 快速向下滑动
        if (velocity > VELOCITY_THRESHOLD) {
            if (sheetState === 'expanded') return 'half';
            return 'collapsed';
        }

        // 根据位置判断
        if (currentHeightVh > 75) return 'expanded';
        if (currentHeightVh > 48) return 'half';
        return 'collapsed';
    }, [sheetState]);

    // 触摸开始
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        const touch = e.touches[0];
        startYRef.current = touch.clientY;
        startTimeRef.current = Date.now();
        currentHeightRef.current = SHEET_HEIGHTS[sheetState];
        setIsDragging(true);
    }, [sheetState]);

    // 触摸移动
    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isDragging) return;

        const touch = e.touches[0];
        const deltaY = startYRef.current - touch.clientY;
        setDragOffset(deltaY);
    }, [isDragging]);

    // 触摸结束
    const handleTouchEnd = useCallback(() => {
        if (!isDragging) return;

        const endTime = Date.now();
        const duration = endTime - startTimeRef.current;
        const velocity = dragOffset / duration; // px/ms

        const windowHeight = window.innerHeight;
        const currentHeightPx = (currentHeightRef.current / 100) * windowHeight + dragOffset;

        const targetState = determineTargetState(currentHeightPx, velocity);
        updateState(targetState);

        setIsDragging(false);
        setDragOffset(0);
    }, [isDragging, dragOffset, determineTargetState, updateState]);

    // Handle 点击切换状态
    const handleHandleClick = useCallback(() => {
        if (sheetState === 'collapsed') {
            updateState('expanded');
        } else {
            updateState('collapsed');
        }
    }, [sheetState, updateState]);

    // 计算实际高度
    const baseHeight = SHEET_HEIGHTS[sheetState];
    const draggedHeightVh = isDragging
        ? baseHeight + (dragOffset / window.innerHeight) * 100
        : baseHeight;
    const finalHeight = Math.max(30, Math.min(95, draggedHeightVh));

    // 阻止内容区域触摸事件冒泡到拖拽层
    const handleContentTouch = useCallback((e: React.TouchEvent) => {
        // 只有在内容区域顶部且向下滑动时才允许拖拽关闭
        const target = e.target as HTMLElement;
        const scrollContainer = target.closest('.sheet-content');
        if (scrollContainer && scrollContainer.scrollTop > 0) {
            e.stopPropagation();
        }
    }, []);

    return (
        <div
            ref={sheetRef}
            className={`
                fixed bottom-0 left-0 right-0 z-50
                bg-white rounded-t-3xl shadow-2xl
                flex flex-col overflow-hidden
                ${isDragging ? '' : 'transition-all duration-300 ease-out'}
            `}
            style={{
                height: `${finalHeight}vh`,
                boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.15)',
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Handle 拖拽提示条 */}
            <div
                className="shrink-0 flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
                onClick={handleHandleClick}
            >
                <div className="w-10 h-1 bg-slate-300 rounded-full" />
            </div>

            {/* Header 区域 (如城市信息、天数选择器) */}
            {headerContent && (
                <div className="shrink-0 border-b border-slate-100">
                    {headerContent}
                </div>
            )}

            {/* 可滚动内容区域 */}
            <div
                className="sheet-content flex-1 overflow-y-auto overscroll-contain"
                onTouchStart={handleContentTouch}
            >
                {children}
            </div>

            {/* 底部安全区域 */}
            <div className="shrink-0 safe-area-bottom" />
        </div>
    );
}
