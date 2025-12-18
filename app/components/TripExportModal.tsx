'use client';

import React, { useRef, useState, useEffect } from 'react';
import { X, Download, Share2, Loader2, Image as ImageIcon, FileText } from 'lucide-react';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import { TripPlan } from '../types';
import TripCheatsheetView from './TripCheatsheetView';

interface TripExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    tripPlan: TripPlan;
}

type ExportFormat = 'png' | 'pdf';

export default function TripExportModal({ isOpen, onClose, tripPlan }: TripExportModalProps) {
    const exportRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setGeneratedImage(null);
            setIsExporting(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const generateExport = async () => {
        if (!exportRef.current) return;

        try {
            setIsExporting(true);

            // Wait for images to load
            await new Promise(resolve => setTimeout(resolve, 1200));

            // Calculate dimensions
            const daysCount = tripPlan.timeline.length;
            const contentWidth = (daysCount * 320) + ((daysCount - 1) * 24) + 80;
            const contentHeight = exportRef.current.scrollHeight;

            console.log('Starting export with dimensions:', contentWidth, 'x', contentHeight);

            const canvas = await html2canvas(exportRef.current, {
                useCORS: true,
                allowTaint: true,
                scale: 2, // High quality
                backgroundColor: '#f8fafc',
                logging: false,
                windowWidth: contentWidth + 100,
                windowHeight: contentHeight + 100,
                scrollX: 0,
                scrollY: 0,
                x: 0,
                y: 0,
                onclone: (clonedDoc: Document) => {
                    const element = clonedDoc.getElementById('trip-cheatsheet-export');
                    if (element) {
                        element.style.display = 'flex';
                        element.style.flexDirection = 'row';
                        element.style.width = 'max-content';
                        element.style.minWidth = `${contentWidth}px`;
                        element.style.height = 'auto';

                        // Ensure cards overflow is visible
                        const cards = element.querySelectorAll('[class*="rounded-xl"]');
                        cards.forEach((card) => {
                            const htmlCard = card as HTMLElement;
                            htmlCard.style.overflow = 'visible';
                        });
                    }
                }
            });

            const base64Image = canvas.toDataURL('image/png');
            setGeneratedImage(base64Image);

            // Export based on selected format
            if (exportFormat === 'pdf') {
                // Create PDF with original canvas dimensions
                const pdf = new jsPDF({
                    orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
                    unit: 'px',
                    format: [canvas.width, canvas.height]
                });

                pdf.addImage(base64Image, 'PNG', 0, 0, canvas.width, canvas.height);
                pdf.save(`${tripPlan.meta.city}_行程总览.pdf`);
            } else {
                // PNG export
                try {
                    canvas.toBlob((blob: Blob | null) => {
                        if (blob) {
                            saveAs(blob, `${tripPlan.meta.city}_行程总览.png`);
                        }
                    });
                } catch (e) {
                    console.warn('Auto download failed:', e);
                }
            }
        } catch (error) {
            console.error('Export failed:', error);
            alert('生成失败，请重试');
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
                            <p className="text-xs text-slate-500">生成高清长图或PDF，方便分享与保存</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Area */}
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
                            <div className="mt-4 flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium">
                                <ImageIcon className="w-4 h-4" />
                                <span>
                                    {exportFormat === 'pdf'
                                        ? 'PDF已生成！文件应已自动下载'
                                        : '如未自动下载，请长按图片保存'}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="inline-block min-w-full min-h-full">
                            <div className="shadow-xl bg-slate-50 rounded-xl overflow-hidden w-fit mx-auto">
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
                    <div className="flex items-center gap-2">
                        {!generatedImage && (
                            <>
                                <span className="text-sm text-slate-500">导出格式：</span>
                                <div className="flex bg-slate-100 rounded-lg p-0.5">
                                    <button
                                        onClick={() => setExportFormat('pdf')}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${exportFormat === 'pdf'
                                            ? 'bg-white text-indigo-600 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                    >
                                        <FileText size={14} />
                                        PDF
                                    </button>
                                    <button
                                        onClick={() => setExportFormat('png')}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${exportFormat === 'png'
                                            ? 'bg-white text-indigo-600 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                    >
                                        <ImageIcon size={14} />
                                        PNG
                                    </button>
                                </div>
                            </>
                        )}
                        {generatedImage && (
                            <button
                                onClick={() => setGeneratedImage(null)}
                                className="text-sm text-slate-500 hover:text-slate-700 underline"
                            >
                                返回预览
                            </button>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors"
                        >
                            关闭
                        </button>

                        {!generatedImage ? (
                            <button
                                onClick={generateExport}
                                disabled={isExporting}
                                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transition-all disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-95"
                            >
                                {isExporting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        正在生成...
                                    </>
                                ) : (
                                    <>
                                        {exportFormat === 'pdf' ? <FileText className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                                        生成{exportFormat === 'pdf' ? 'PDF' : '图片'}
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={generateExport}
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
