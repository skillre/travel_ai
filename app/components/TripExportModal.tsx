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

            // Wait for images to load completely
            await new Promise(resolve => setTimeout(resolve, 1500));

            const element = exportRef.current;

            // 找到实际的导出容器
            const exportContainer = element.querySelector('#trip-cheatsheet-export') as HTMLElement;
            if (!exportContainer) {
                throw new Error('Export container not found');
            }

            // 获取真实的内容尺寸 - 这是关键！
            const actualWidth = exportContainer.scrollWidth;
            const actualHeight = exportContainer.scrollHeight;

            console.log('=== Export Debug ===');
            console.log('Content dimensions:', actualWidth, 'x', actualHeight);

            // 使用 scale: 2 来获得高清图片
            const scale = 2;

            const canvas = await html2canvas(exportContainer, {
                useCORS: true,
                allowTaint: true,
                scale: scale,
                backgroundColor: '#f8fafc',
                logging: true,
                // 关键：不要设置 width/height，让 html2canvas 自动计算
                // 只设置 windowWidth/windowHeight 来模拟视口
                windowWidth: actualWidth + 200,
                windowHeight: actualHeight + 200,
                scrollX: 0,
                scrollY: 0,
                x: 0,
                y: 0,
                onclone: (clonedDoc: Document) => {
                    const clonedElement = clonedDoc.getElementById('trip-cheatsheet-export');
                    if (clonedElement) {
                        // 强制设置容器为自然尺寸
                        clonedElement.style.position = 'relative';
                        clonedElement.style.display = 'flex';
                        clonedElement.style.flexDirection = 'row';
                        clonedElement.style.flexWrap = 'nowrap';
                        clonedElement.style.width = 'auto';
                        clonedElement.style.minWidth = `${actualWidth}px`;
                        clonedElement.style.height = 'auto';
                        clonedElement.style.minHeight = `${actualHeight}px`;
                        clonedElement.style.overflow = 'visible';
                        clonedElement.style.transform = 'none';

                        // 确保每个日期列保持固定宽度且不压缩高度
                        const dayColumns = clonedElement.querySelectorAll('[data-day-column="true"]');
                        dayColumns.forEach((col) => {
                            const htmlCol = col as HTMLElement;
                            htmlCol.style.width = '320px';
                            htmlCol.style.minWidth = '320px';
                            htmlCol.style.maxWidth = '320px';
                            htmlCol.style.flexShrink = '0';
                            htmlCol.style.height = 'auto';
                            htmlCol.style.overflow = 'visible';
                        });

                        // 确保所有卡片可见
                        const allElements = clonedElement.querySelectorAll('*');
                        allElements.forEach((el) => {
                            const htmlEl = el as HTMLElement;
                            if (htmlEl.style) {
                                htmlEl.style.visibility = 'visible';
                                // 不要设置 transform: none，因为可能会影响一些定位
                            }
                        });
                    }
                }
            });

            console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
            console.log('Expected dimensions with scale:', actualWidth * scale, 'x', actualHeight * scale);

            const base64Image = canvas.toDataURL('image/png', 1.0);
            setGeneratedImage(base64Image);

            // 导出
            if (exportFormat === 'pdf') {
                // 关键修复：PDF 使用逻辑尺寸（除以 scale），而不是像素尺寸
                const pdfWidth = canvas.width / scale;
                const pdfHeight = canvas.height / scale;

                console.log('PDF dimensions:', pdfWidth, 'x', pdfHeight);

                const pdf = new jsPDF({
                    orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
                    unit: 'px',
                    format: [pdfWidth, pdfHeight],
                    hotfixes: ['px_scaling'] // 修复像素缩放问题
                });

                // 使用逻辑尺寸添加图片
                pdf.addImage(base64Image, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save(`${tripPlan.meta.city}_行程总览.pdf`);
            } else {
                // PNG export
                try {
                    canvas.toBlob((blob: Blob | null) => {
                        if (blob) {
                            saveAs(blob, `${tripPlan.meta.city}_行程总览.png`);
                        }
                    }, 'image/png', 1.0);
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
                            <div
                                className="shadow-xl bg-slate-50 rounded-xl w-fit"
                                style={{
                                    overflow: 'visible',
                                    width: 'fit-content'
                                }}
                            >
                                <div
                                    ref={exportRef}
                                    className="bg-slate-50"
                                    style={{
                                        width: 'fit-content',
                                        minWidth: 'max-content',
                                        overflow: 'visible'
                                    }}
                                >
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
