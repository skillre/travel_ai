
import { NextRequest, NextResponse } from 'next/server';
import { renderToStaticMarkup } from 'react-dom/server';
import puppeteer from 'puppeteer-core';
// 注意：在标准 Docker 环境中，我们使用 puppeteer-core 配合手动安装的 chromium

import TripCheatsheetView from '../../components/TripCheatsheetView';
import TripRouteMapView from '../../components/TripRouteMapView';
import DayDetailExportView from '../../components/DayDetailExportView';
import { TripPlan, TripPlanDay } from '../../types';

// 强制使用 Node.js Runtime，避免 Edge Runtime 兼容性问题
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 延长超时时间 (秒)

// 构建完整 HTML 的辅助函数
const buildFullHtml = (componentHtml: string) => {
    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        
        <!-- Tailwind CDN -->
        <script src="https://cdn.tailwindcss.com"></script>
        
        <!-- Google Noto CJK Fonts -->
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700;900&display=swap" rel="stylesheet">

        <script>
            tailwind.config = {
                theme: {
                    extend: {
                        fontFamily: {
                            sans: ['"Noto Sans SC"', 'sans-serif'],
                        }
                    }
                }
            }
        </script>

        <style>
          body { 
            font-family: 'Noto Sans SC', sans-serif; 
            background-color: transparent;
            margin: 0;
            padding: 0;
          }
          /* 打印/PDF 专用样式 */
          @page { margin: 0; size: auto; }
          
          /* 确保背景色打印 */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        </style>
      </head>
      <body>
        <div id="root" style="display: inline-block;">
            ${componentHtml}
        </div>
        
        <script>
          window.isReadyForExport = false;
          window.onload = () => {
             const imgs = document.images;
             const promises = Array.from(imgs).map(img => {
                 if (img.complete) return Promise.resolve();
                 return new Promise(resolve => { 
                     img.onload = resolve; 
                     img.onerror = resolve; // 即使加载失败也继续
                 });
             });
             
             Promise.all(promises).then(() => {
                 // 给予缓冲时间让布局和字体稳定
                 // 使用 document.fonts.ready 确保字体加载
                 document.fonts.ready.then(() => {
                     setTimeout(() => { 
                         window.isReadyForExport = true; 
                     }, 200);
                 });
             });
          };
        </script>
      </body>
    </html>
  `;
};

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { type, tripPlan, dayPlan, exportFormat = 'png' } = body;

        if (!tripPlan) {
            return NextResponse.json({ error: 'Missing tripPlan' }, { status: 400 });
        }

        // 1. 渲染对应的 React 组件为 HTML 字符串
        let componentHtml = '';

        if (type === 'overview') {
            componentHtml = renderToStaticMarkup(
                <TripCheatsheetView tripPlan={tripPlan as TripPlan} />
            );
        } else if (type === 'map') {
            componentHtml = renderToStaticMarkup(
                <TripRouteMapView tripPlan={tripPlan as TripPlan} />
            );
        } else if (type === 'day') {
            if (!dayPlan) {
                return NextResponse.json({ error: 'Missing dayPlan for day export' }, { status: 400 });
            }
            componentHtml = renderToStaticMarkup(
                <DayDetailExportView
                    dayPlan={dayPlan as TripPlanDay}
                    meta={(tripPlan as TripPlan).meta}
                    showQRCode={true}
                // qrCodeUrl 可以从前端传，也可以后端生成，这里先留空走 CSS 占位
                />
            );
        } else {
            return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
        }

        // 2. 包装成完整页面
        const fullHtml = buildFullHtml(componentHtml);

        console.log(`[Export API] Launching Puppeteer for ${type}...`);

        // 3. 启动 Puppeteer
        // 生产环境 (Docker) 使用 executablePath: '/usr/bin/chromium'
        // 本地开发如果没有装 Chromium，可能会失败，除非装了 puppeteer (full)

        let browser;
        try {
            browser = await puppeteer.launch({
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage', // 防止内存溢出
                    '--font-render-hinting=none', // 优化字体渲染
                ],
                executablePath: process.env.NODE_ENV === 'production' || process.env.PUPPETEER_EXECUTABLE_PATH
                    ? '/usr/bin/chromium'
                    : undefined, // 本地开发自动寻找
                headless: true,
            });
        } catch (launchError) {
            console.error('Puppeteer launch failed:', launchError);
            return NextResponse.json({
                error: 'Browser launch failed. Please ensure Chromium is installed.',
                detail: String(launchError)
            }, { status: 500 });
        }

        try {
            const page = await browser.newPage();

            // 设置内容
            await page.setContent(fullHtml, {
                waitUntil: 'networkidle0',
                timeout: 30000
            });

            // 等待图片和字体加载就绪
            console.log('[Export API] Waiting for resources...');
            await page.waitForFunction('window.isReadyForExport === true', { timeout: 15000 }).catch(() => {
                console.warn('[Export API] Wait for resources timeout, proceeding anyway...');
            });

            // 获取内容实际高度
            const boundingBox = await page.evaluate(() => {
                const root = document.getElementById('root');
                return root ? { width: root.offsetWidth, height: root.offsetHeight } : null;
            });

            if (!boundingBox) {
                throw new Error('Content root not found');
            }

            console.log(`[Export API] Content dimensions: ${boundingBox.width}x${boundingBox.height}`);

            let buffer: Buffer;

            if (exportFormat === 'pdf') {
                // PDF 导出
                buffer = await page.pdf({
                    width: boundingBox.width + 'px',
                    height: (boundingBox.height + 2) + 'px', // 微调防止裁剪
                    printBackground: true,
                    pageRanges: '1',
                    margin: { top: 0, right: 0, bottom: 0, left: 0 }
                });
            } else {
                // PNG 导出
                // 设置视口大小以匹配内容，确保高清 (scale 2)
                const scale = 2;
                await page.setViewport({
                    width: Math.ceil(boundingBox.width),
                    height: Math.ceil(boundingBox.height),
                    deviceScaleFactor: scale,
                });

                buffer = await page.screenshot({
                    fullPage: true,
                    type: 'png',
                    omitBackground: true, // 透明背景
                });
            }

            console.log(`[Export API] Generated ${exportFormat} buffer size: ${buffer.length}`);

            return new NextResponse(buffer as any, {
                status: 200,
                headers: {
                    'Content-Type': exportFormat === 'pdf' ? 'application/pdf' : 'image/png',
                    'Content-Disposition': `attachment; filename="export.${exportFormat}"`,
                },
            });

        } finally {
            if (browser) {
                await browser.close();
            }
        }

    } catch (error) {
        console.error('[Export API] Error:', error);
        return NextResponse.json({ error: 'Export failed' }, { status: 500 });
    }
}
