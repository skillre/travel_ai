'use client';

import React from 'react';
import { TripPlanDay, TripPlanMeta } from '../types';
import { useUnsplashImage } from '../hooks/useUnsplashImage';
import DayDetailLayout from './DayDetailLayout';
import { Loader2, Utensils, Camera } from 'lucide-react';

interface DayDetailExportViewProps {
    dayPlan: TripPlanDay;
    meta: TripPlanMeta;
    className?: string;
    id?: string;
    showQRCode?: boolean;
    qrCodeUrl?: string;
}

const ClientSpotImage = ({ title, city, type, resolvedImageUrl }: { title: string; city: string; type: 'spot' | 'food'; resolvedImageUrl?: string }) => {
    // 如果有预解析的图片 URL，直接使用
    if (resolvedImageUrl) {
        return (
            <img
                src={resolvedImageUrl}
                alt={title}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    display: 'block'
                }}
            />
        );
    }

    // 否则使用 Hook (客户端模式)
    const { imageUrl, isLoading } = useUnsplashImage(title, city, type);

    if (isLoading) {
        return (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-300">
                <Loader2 className="w-6 h-6 animate-spin" />
            </div>
        );
    }

    if (imageUrl) {
        return (
            <div
                className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: `url(${imageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            />
        );
    }

    return (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-300">
            {type === 'food' ? <Utensils size={32} /> : <Camera size={32} />}
        </div>
    );
};

export default function DayDetailExportView(props: DayDetailExportViewProps) {
    return (
        <DayDetailLayout
            {...props}
            renderImage={(imgProps) => <ClientSpotImage {...imgProps} />}
        />
    );
}
