'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, RotateCw, ZoomIn, ZoomOut, Check } from 'lucide-react';
import { Area, Point } from 'react-easy-crop';

interface AvatarCropModalProps {
    isOpen: boolean;
    imageSrc: string;
    onClose: () => void;
    onCropComplete: (croppedImageBlob: Blob) => Promise<void>;
}

export default function AvatarCropModal({
    isOpen,
    imageSrc,
    onClose,
    onCropComplete,
}: AvatarCropModalProps) {
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    if (!isOpen) return null;

    const onCropChange = useCallback((crop: Point) => {
        setCrop(crop);
    }, []);

    const onZoomChange = useCallback((zoom: number) => {
        setZoom(Math.max(0.5, Math.min(3, zoom))); // 限制缩放范围 0.5-3x
    }, []);

    const onRotationChange = useCallback((rotation: number) => {
        setRotation(rotation);
    }, []);

    const onCropCompleteCallback = useCallback(
        (croppedArea: Area, croppedAreaPixels: Area) => {
            setCroppedAreaPixels(croppedAreaPixels);
        },
        []
    );

    // 创建图片元素并转换为 Blob
    const createImage = (url: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', () => resolve(image));
            image.addEventListener('error', (error) => reject(error));
            image.src = url;
            image.crossOrigin = 'anonymous';
        });
    };

    // 获取旋转后的图片尺寸
    const getRadianAngle = (degreeValue: number) => {
        return (degreeValue * Math.PI) / 180;
    };

    const rotateSize = (width: number, height: number, rotation: number) => {
        const rotRad = getRadianAngle(rotation);
        return {
            width:
                Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
            height:
                Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
        };
    };

    // 获取裁剪后的图片
    const getCroppedImg = async (
        imageSrc: string,
        pixelCrop: Area,
        rotation = 0,
        flip = { horizontal: false, vertical: false }
    ): Promise<Blob> => {
        const image = await createImage(imageSrc);
        const rotRad = getRadianAngle(rotation);

        // 计算旋转后的边界框尺寸
        const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
            image.width,
            image.height,
            rotation
        );

        // 创建用于旋转的 canvas
        const rotCanvas = document.createElement('canvas');
        rotCanvas.width = bBoxWidth;
        rotCanvas.height = bBoxHeight;
        const rotCtx = rotCanvas.getContext('2d');

        if (!rotCtx) {
            throw new Error('无法创建旋转 Canvas 上下文');
        }

        // 移动到中心点
        rotCtx.translate(bBoxWidth / 2, bBoxHeight / 2);
        // 应用旋转
        rotCtx.rotate(rotRad);
        // 应用翻转
        rotCtx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
        // 绘制图片（从中心绘制）
        rotCtx.drawImage(image, -image.width / 2, -image.height / 2);

        // 计算裁剪区域在旋转后 canvas 中的位置
        // pixelCrop 是相对于原始图片的坐标，需要转换到旋转后的坐标系
        const imageCenterX = image.width / 2;
        const imageCenterY = image.height / 2;
        const cropCenterX = pixelCrop.x + pixelCrop.width / 2;
        const cropCenterY = pixelCrop.y + pixelCrop.height / 2;

        // 调试日志
        console.log('裁剪参数:', {
            imageSize: { width: image.width, height: image.height },
            pixelCrop,
            rotation,
            bBoxSize: { width: bBoxWidth, height: bBoxHeight },
            cropCenter: { x: cropCenterX, y: cropCenterY },
            imageCenter: { x: imageCenterX, y: imageCenterY },
        });

        // 裁剪中心相对于图片中心的偏移
        const offsetX = cropCenterX - imageCenterX;
        const offsetY = cropCenterY - imageCenterY;

        // 旋转这个偏移量（注意：因为图片顺时针旋转了 rotation，偏移量需要逆时针旋转）
        const cos = Math.cos(-rotRad);
        const sin = Math.sin(-rotRad);
        const rotatedOffsetX = offsetX * cos - offsetY * sin;
        const rotatedOffsetY = offsetX * sin + offsetY * cos;

        // 在旋转后的 canvas 中，裁剪区域中心的位置
        const canvasCropCenterX = bBoxWidth / 2 + rotatedOffsetX;
        const canvasCropCenterY = bBoxHeight / 2 + rotatedOffsetY;

        // 裁剪区域左上角的位置
        const canvasCropX = canvasCropCenterX - pixelCrop.width / 2;
        const canvasCropY = canvasCropCenterY - pixelCrop.height / 2;

        // 创建最终输出的 canvas（1:1 正方形）
        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = pixelCrop.width;
        outputCanvas.height = pixelCrop.height;
        const outputCtx = outputCanvas.getContext('2d');

        if (!outputCtx) {
            throw new Error('无法创建输出 Canvas 上下文');
        }

        // 填充白色背景（防止透明区域）
        outputCtx.fillStyle = '#FFFFFF';
        outputCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

        // 从旋转后的 canvas 中提取裁剪区域
        // 计算实际可用的源区域（确保不超出 canvas 边界）
        const sourceX = Math.max(0, Math.floor(canvasCropX));
        const sourceY = Math.max(0, Math.floor(canvasCropY));
        const maxSourceX = Math.min(rotCanvas.width, Math.floor(canvasCropX + pixelCrop.width));
        const maxSourceY = Math.min(rotCanvas.height, Math.floor(canvasCropY + pixelCrop.height));
        const sourceWidth = Math.max(0, maxSourceX - sourceX);
        const sourceHeight = Math.max(0, maxSourceY - sourceY);

        // 计算目标位置（如果源位置被裁剪了，调整目标位置以保持对齐）
        const destX = sourceX > canvasCropX ? sourceX - canvasCropX : 0;
        const destY = sourceY > canvasCropY ? sourceY - canvasCropY : 0;

        // 调试日志
        console.log('裁剪区域计算:', {
            canvasCrop: { x: canvasCropX, y: canvasCropY },
            source: { x: sourceX, y: sourceY, width: sourceWidth, height: sourceHeight },
            dest: { x: destX, y: destY },
            rotCanvasSize: { width: rotCanvas.width, height: rotCanvas.height },
            outputSize: { width: outputCanvas.width, height: outputCanvas.height },
        });

        // 从旋转后的 canvas 提取裁剪区域到输出 canvas
        if (sourceWidth > 0 && sourceHeight > 0) {
            outputCtx.drawImage(
                rotCanvas,
                sourceX,
                sourceY,
                sourceWidth,
                sourceHeight,
                destX,
                destY,
                sourceWidth,
                sourceHeight
            );
        } else {
            console.error('裁剪区域无效:', { sourceWidth, sourceHeight });
        }

        // 转换为 Blob (JPEG 格式，质量 0.9)
        return new Promise((resolve, reject) => {
            outputCanvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('无法生成图片'));
                    }
                },
                'image/jpeg',
                0.9
            );
        });
    };

    const handleSave = async () => {
        if (!croppedAreaPixels) {
            return;
        }

        setIsProcessing(true);
        try {
            const croppedImageBlob = await getCroppedImg(
                imageSrc,
                croppedAreaPixels,
                rotation
            );
            await onCropComplete(croppedImageBlob);
        } catch (error) {
            console.error('裁剪图片失败:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center animate-fade-in">
            {/* 背景遮罩 */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* 裁剪容器 */}
            <div
                className="relative z-10 w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 头部 */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-800">裁剪头像</h3>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* 裁剪区域 */}
                <div className="relative w-full" style={{ height: '400px' }}>
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={1} // 1:1 正方形
                        onCropChange={onCropChange}
                        onZoomChange={onZoomChange}
                        onRotationChange={onRotationChange}
                        onCropComplete={onCropCompleteCallback}
                        cropShape="round" // 圆形遮罩
                        showGrid={false}
                        style={{
                            containerStyle: {
                                width: '100%',
                                height: '100%',
                                position: 'relative',
                            },
                            cropAreaStyle: {
                                border: '2px solid white',
                                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                            },
                        }}
                    />
                </div>

                {/* 控制面板 */}
                <div className="p-4 bg-slate-50 border-t border-slate-200">
                    {/* 缩放控制 */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <ZoomIn className="w-4 h-4" />
                                <span>缩放</span>
                            </div>
                            <span className="text-sm text-slate-500">{Math.round(zoom * 100)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0.5"
                            max="3"
                            step="0.1"
                            value={zoom}
                            onChange={(e) => onZoomChange(parseFloat(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-tender-blue-500"
                        />
                    </div>

                    {/* 旋转控制 */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <RotateCw className="w-4 h-4" />
                                <span>旋转</span>
                            </div>
                            <span className="text-sm text-slate-500">{rotation}°</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="360"
                            step="1"
                            value={rotation}
                            onChange={(e) => onRotationChange(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-tender-blue-500"
                        />
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-2.5 px-4 bg-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-300 transition-colors"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isProcessing || !croppedAreaPixels}
                            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-tender-blue-500 to-fresh-green-500 text-white rounded-xl font-medium hover:from-tender-blue-400 hover:to-fresh-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                        >
                            {isProcessing ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>处理中...</span>
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    <span>保存</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

