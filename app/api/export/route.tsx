
import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import { TripPlan, TripPlanDay } from '../../types';
import { generateExportHtml } from '../../lib/html-generator';

// 强制使用 Node.js Runtime，避免 Edge Runtime 兼容性问题
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 延长超时时间 (秒)

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { type, tripPlan, dayPlan, exportFormat = 'png' } = body;

        if (!tripPlan) {
            return NextResponse.json({ error: 'Missing tripPlan' }, { status: 400 });
        }

        // 1. 生成 HTML (逻辑已移至 lib/html-generator.tsx)
        let fullHtml = '';
        try {
            fullHtml = generateExportHtml(type, tripPlan as TripPlan, dayPlan as TripPlanDay);
        } catch (err: any) {
            return NextResponse.json({ error: err.message }, { status: 400 });
        }

        console.log(`[Export API] Launching Puppeteer for ${type}...`);

        // 2. 启动 Puppeteer
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
