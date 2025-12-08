// ===========================================
// 新版数据结构 (TripPlan)
// ===========================================

export interface TripPlanMeta {
    city: string;
    trip_title: string;
    trip_vibe: string;
    total_estimated_cost: number;
    suggestion: string;
}

export interface TripPlanItemContent {
    desc: string;
    highlight_label: string; // "避坑指南" 或 "必点推荐"
    highlight_text: string;
}

export interface TripPlanItem {
    type: 'spot' | 'food';
    time_label: string; // e.g. "上午", "午餐"
    title: string;
    sub_title: string; // e.g. "建议游玩 2小时" 或 "距上一站步行 300m"
    location: { lat: number; lng: number };
    emoji: string;
    tags: string[];
    content: TripPlanItemContent;
    cost: number;
}

export interface TripPlanDay {
    day: number;
    date_theme: string;
    day_summary: string;
    items: TripPlanItem[];
}

export interface TripPlan {
    meta: TripPlanMeta;
    timeline: TripPlanDay[];
}

// ===========================================
// 旧版数据结构 (兼容)
// ===========================================

export interface LegacyRoute {
    time_period?: string;
    name: string;
    desc: string;
    latitude: number;
    longitude: number;
    suggested_duration?: string;
    emoji?: string;
    tags?: string[];
    food_recommendation?: string;
    tips?: string;
    cost?: number;
}

export interface LegacyDailyPlan {
    day: number;
    theme?: string;
    routes: LegacyRoute[];
}

export interface LegacyTripData {
    city: string;
    total_days?: number;
    trip_title?: string;
    trip_overview?: string;
    trip_vibe?: string;
    daily_plan: LegacyDailyPlan[];
}

// ===========================================
// 联合类型：支持新旧两种格式
// ===========================================

export type TripData = TripPlan | LegacyTripData;

// 类型守卫：检测是否为新版数据格式
export function isNewTripPlan(data: TripData): data is TripPlan {
    return 'meta' in data && 'timeline' in data;
}
