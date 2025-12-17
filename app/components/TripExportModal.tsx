'use client';

import React, { useRef, useState, useEffect } from 'react';
import { X, Download, Share2, Loader2, Image as ImageIcon } from 'lucide-react';
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
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setGeneratedImage(null);
            setIsExporting(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const generateImage = async (shouldDownload: boolean = true) => {
        if (!exportRef.current) return;

        try {
            setIsExporting(true);

            // Wait a moment for any last renders (images etc)
            await new Promise(resolve => setTimeout(resolve, 800));

            // Calculate exact width needed: 320px per day + 8px gap + padding
            const daysCount = tripPlan.timeline.length;
            const contentWidth = (daysCount * 320) + (daysCount * 32) + 200; // ample buffer

            console.log('Starting export with width:', contentWidth);

            const canvas = await html2canvas(exportRef.current, {
                useCORS: true, // CRITICAL for maps/images
                allowTaint: true,
                scale: 2, // Retina quality
                backgroundColor: '#f8fafc', // match bg-slate-50
                logging: false,
                // CRITICAL: Force window dimensions to capture full scroll width
                windowWidth: contentWidth,
                windowHeight: exportRef.current.scrollHeight + 100,
                scrollX: 0,
                scrollY: 0,
                x: 0,
                y: 0,
                onclone: (clonedDoc: Document) => {
                    const element = clonedDoc.getElementById('trip-cheatsheet-export');
                    if (element) {
                        // Ensure the cloned element acts as a flex row
                        element.style.display = 'flex';
                        element.style.flexDirection = 'row';
                        element.style.width = 'max-content'; // Allow it to expand naturally
                        element.style.minWidth = `${contentWidth}px`;
                    }
                }
            });

            const base64Image = canvas.toDataURL('image/png');
            setGeneratedImage(base64Image);

            if (shouldDownload) {
                // Try automatic download
                try {
                    canvas.toBlob((blob) => {
                        if (blob) {
                            saveAs(blob, `${tripPlan.meta.city}_Trip_Overview.png`);
                        }
                    });
                } catch (e) {
                    console.warn('Auto download failed, falling back to manual save', e);
                }
            }
        } catch (error) {
            console.error('Export failed:', error);
            alert('生成图片失败，请重试');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white z-10">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                            <Share2 className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">行程总览导出</h2>
                            <p className="text-xs text-slate-500">生成高清长图，方便分享</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Area - Fixed Scrolling */}
                <div className="flex-1 bg-slate-100 overflow-auto relative p-4 md:p-8">
                    {generatedImage ? (
                        <div className="flex flex-col items-center animate-in zoom-in duration-300 min-h-full justify-center">
                            <div className="bg-white p-2 rounded-xl shadow-lg border border-slate-200 max-w-full">
                                <img
                                    src={generatedImage}
                                    alt="Generated Trip Plan"
                                    className="max-h-[65vh] w-auto rounded-lg object-contain"
                                />
                            </div>
                            <div className="mt-4 flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-full text-sm font-medium animate-pulse shrink-0">
                                <ImageIcon className="w-4 h-4" />
                                <span>如果未自动下载，请长按图片保存到相册</span>
                            </div>
                        </div>
                    ) : (
                        // Wrapper to ensure scroll is possible in all directions
                        <div className="inline-block min-w-full min-h-full">
                            <div className="shadow-xl bg-slate-50 rounded-xl overflow-hidden w-fit mx-auto">
                                {/* Original DOM for Preview & Capture */}
                                <div ref={exportRef} className="bg-slate-50">
                                    <TripCheatsheetView
                                        tripPlan={tripPlan}
                                        id="trip-cheatsheet-export"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer / Actions */}
                <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-between items-center z-10">
                    <button
                        onClick={() => setGeneratedImage(null)}
                        className={`text-sm text-slate-500 hover:text-slate-700 underline ${!generatedImage ? 'invisible' : ''}`}
                    >
                        返回预览
                    </button>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors"
                        >
                            关闭
                        </button>

                        {!generatedImage ? (
                            <button
                                onClick={() => generateImage(true)}
                                disabled={isExporting}
                                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transition-all disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-95"
                            >
                                {isExporting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        正在生成长图...
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-4 h-4" />
                                        生成总览图片
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={() => generateImage(true)} // Re-trigger download logic if needed
                                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-md transition-all active:scale-95"
                            >
                                <Download className="w-4 h-4" />
                                再次下载
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
