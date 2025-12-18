import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
// import { renderToStaticMarkup } from 'react-dom/server';
import { TripPlan, TripPlanDay, TripPlanItem } from '../../types';
import TripCheatsheetView from '../../components/TripCheatsheetView';
import TripRouteMapView from '../../components/TripRouteMapView';
import DayDetailExportView from '../../components/DayDetailExportView';

// 强制使用 Node.js Runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// --- HTML Builder Helper (Inlined) ---
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

function generateExportHtml(type: string, tripPlan: TripPlan, dayPlan?: TripPlanDay): string {
    // 使用 require 动态引入以绕过 Next.js 的静态分析检查
    // @ts-ignore
    const { renderToStaticMarkup } = require('react-dom/server');

    let componentHtml = '';

    if (type === 'overview') {
        componentHtml = renderToStaticMarkup(
            <TripCheatsheetView tripPlan={tripPlan} />
        );
    } else if (type === 'map') {
        componentHtml = renderToStaticMarkup(
            <TripRouteMapView tripPlan={tripPlan} />
        );
    } else if (type === 'day') {
        if (!dayPlan) {
            throw new Error('Missing dayPlan for day export');
        }
        componentHtml = renderToStaticMarkup(
            <DayDetailExportView
                dayPlan={dayPlan}
                meta={tripPlan.meta}
                showQRCode={true}
            />
        );
    } else {
        throw new Error('Invalid export type');
    }

    return buildFullHtml(componentHtml);
}

// --- Main Route Handler ---

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { type, tripPlan, dayPlan, exportFormat = 'png' } = body;

        if (!tripPlan) {
            return NextResponse.json({ error: 'Missing tripPlan' }, { status: 400 });
        }

        // 1. 生成 HTML
        let fullHtml = '';
        try {
            fullHtml = generateExportHtml(type, tripPlan as TripPlan, dayPlan as TripPlanDay);
        } catch (err: any) {
            console.error('HTML Generation Error:', err);
            return NextResponse.json({ error: err.message }, { status: 400 });
        }

        console.log(`[Export API] Launching Puppeteer for ${type}...`);

        // 2. 启动 Puppeteer
        let browser;
        try {
            browser = await puppeteer.launch({
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--font-render-hinting=none',
                ],
                executablePath: process.env.NODE_ENV === 'production' || process.env.PUPPETEER_EXECUTABLE_PATH
                    ? '/usr/bin/chromium'
                    : undefined,
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

            await page.setContent(fullHtml, {
                waitUntil: 'networkidle0',
                timeout: 30000
            });

            console.log('[Export API] Waiting for resources...');
            await page.waitForFunction('window.isReadyForExport === true', { timeout: 15000 }).catch(() => {
                console.warn('[Export API] Wait for resources timeout, proceeding anyway...');
            });

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
                buffer = await page.pdf({
                    width: boundingBox.width + 'px',
                    height: (boundingBox.height + 2) + 'px',
                    printBackground: true,
                    pageRanges: '1',
                    margin: { top: 0, right: 0, bottom: 0, left: 0 }
                });
            } else {
                const scale = 2;
                await page.setViewport({
                    width: Math.ceil(boundingBox.width),
                    height: Math.ceil(boundingBox.height),
                    deviceScaleFactor: scale,
                });

                buffer = await page.screenshot({
                    fullPage: true,
                    type: 'png',
                    omitBackground: true,
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
