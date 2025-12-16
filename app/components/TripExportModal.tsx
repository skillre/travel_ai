'use client';

import React, { useRef, useState } from 'react';
import { X, Download, Share2, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { TripPlan } from '../types';
import TripCheatsheetView from './TripCheatsheetView';

interface TripExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    tripPlan: TripPlan;
}

export default function TripExportModal({ isOpen, onClose, tripPlan }: TripExportModalProps) {
    const exportRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);

    if (!isOpen) return null;

    const handleExport = async () => {
        if (!exportRef.current) return;

        try {
            setIsExporting(true);

            // Wait a moment for any last renders (images etc)
            await new Promise(resolve => setTimeout(resolve, 500));

            const canvas = await html2canvas(exportRef.current, {
                useCORS: true,
                scale: 2, // Higher resolution
                backgroundColor: '#f8fafc', // match bg-slate-50
                logging: false,
                windowWidth: exportRef.current.scrollWidth, // Ensure we capture full scroll width
                windowHeight: exportRef.current.scrollHeight
            });

            canvas.toBlob((blob) => {
                if (blob) {
                    saveAs(blob, `${tripPlan.meta.city}_Trip_Cheatsheet.png`);
                }
                setIsExporting(false);
            });
        } catch (error) {
            console.error('Export failed:', error);
            setIsExporting(false);
            alert('导出图片失败，请重试');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <Share2 className="w-5 h-5 text-indigo-600" />
                        <h2 className="text-lg font-bold text-slate-800">导出行程懒人包</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Preview Area - Scrollable */}
                <div className="flex-1 bg-slate-100 overflow-auto relative p-4 md:p-8">
                    <div className="min-w-fit mx-auto shadow-xl">
                        <div ref={exportRef}>
                            <TripCheatsheetView
                                tripPlan={tripPlan}
                                id="trip-cheatsheet-export"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer / Actions */}
                <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isExporting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                生成中...
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4" />
                                保存图片
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
