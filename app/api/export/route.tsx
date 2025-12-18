import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import { TripPlan, TripPlanDay, TripPlanItem } from '../../types';
import { Utensils, Camera } from 'lucide-react';
import React from 'react';
// Import Layout components instead of Client Views
import TripCheatsheetLayout from '../../components/TripCheatsheetLayout';
import TripRouteMapView from '../../components/TripRouteMapView'; // Now safe (no use client)
import DayDetailLayout from '../../components/DayDetailLayout';

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

// Server-side simple image renderer (no hooks)
const ServerSpotImage = ({ title, city, type, resolvedImageUrl }: { title: string; city: string; type: 'spot' | 'food'; resolvedImageUrl?: string }) => {
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
    // Static Fallback
    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8fafc',
            color: '#cbd5e1'
        }}>
            {/* SVG Icons since we can't use Lucide if context is weird, but we imported them so it's fine */}
            {type === 'food' ? <Utensils size={32} /> : <Camera size={32} />}
        </div>
    );
};

function generateExportHtml(type: string, tripPlan: TripPlan, dayPlan?: TripPlanDay): string {
    // 使用 require 动态引入以绕过 Next.js 的静态分析检查
    // @ts-ignore
    const { renderToStaticMarkup } = require('react-dom/server');

    let componentHtml = '';

    if (type === 'overview') {
        componentHtml = renderToStaticMarkup(
            <TripCheatsheetLayout
                tripPlan={tripPlan}
                renderImage={(props) => <ServerSpotImage {...props} />}
            />
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
            <DayDetailLayout
                dayPlan={dayPlan}
                meta={tripPlan.meta}
                showQRCode={true}
                renderImage={(props) => <ServerSpotImage {...props} />}
            />
        );
    } else {
        throw new Error('Invalid export type');
    }

    return buildFullHtml(componentHtml);
}

// --- Image Resolution Helpers ---

// Cache for server-side fetches
const serverImageCache = new Map<string, { url: string; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

function generateSeedFromQuery(query: string): number {
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
        const char = query.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash % 1000) + 1;
}

function getFallbackImageUrl(query: string): string {
    const seed = generateSeedFromQuery(query);
    return `https://picsum.photos/seed/${seed}/800/600`;
}

async function resolveImagesForTripPlan(tripPlan: TripPlan): Promise<void> {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;

    // Collect all items that need images
    const jobs: Array<{ item: TripPlanItem, query: string }> = [];

    tripPlan.timeline.forEach(day => {
        if (!day.items) return;
        day.items.forEach(item => {
            if (item.type === 'spot' && !item.resolvedImageUrl) {
                const query = `${item.title} ${tripPlan.meta.city}`;
                jobs.push({ item, query });
            }
        });
    });

    if (jobs.length === 0) return;

    console.log(`[Export API] Resolving ${jobs.length} missing images...`);

    // Process in parallel with concurrency limit (e.g., 5)
    // For simplicity here, we just use Promise.all but Unsplash might rate limit.
    // Since this is export, let's limit to first 10 or parallelize carefully.

    const resolveJob = async (job: { item: TripPlanItem, query: string }) => {
        const { item, query } = job;

        // Check cache
        const cached = serverImageCache.get(query);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            item.resolvedImageUrl = cached.url;
            return;
        }

        if (!accessKey) {
            item.resolvedImageUrl = getFallbackImageUrl(query);
            return;
        }

        try {
            const response = await fetch(
                `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query + ' travel china')}&per_page=1&orientation=landscape`,
                {
                    headers: { 'Authorization': `Client-ID ${accessKey}` },
                    next: { revalidate: 3600 } // Next.js fetch cache
                }
            );

            if (!response.ok) throw new Error(`Status ${response.status}`);

            const data = await response.json();
            if (data.results && data.results.length > 0) {
                const url = data.results[0].urls.regular;
                item.resolvedImageUrl = url;
                serverImageCache.set(query, { url, timestamp: Date.now() });
            } else {
                const fallback = getFallbackImageUrl(query);
                item.resolvedImageUrl = fallback;
                serverImageCache.set(query, { url: fallback, timestamp: Date.now() });
            }
        } catch (err) {
            console.warn(`[Export API] Failed to fetch image for ${query}:`, err);
            item.resolvedImageUrl = getFallbackImageUrl(query);
        }
    };

    // Execute in batches to be nice to API
    const batchSize = 5;
    for (let i = 0; i < jobs.length; i += batchSize) {
        const batch = jobs.slice(i, i + batchSize);
        await Promise.all(batch.map(resolveJob));
    }
}

// --- Main Route Handler ---

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { type, tripPlan, dayPlan, exportFormat = 'png' } = body;

        if (!tripPlan) {
            return NextResponse.json({ error: 'Missing tripPlan' }, { status: 400 });
        }

        // 0. Resolve Images Context (Pre-process)
        // If the client didn't send images (resolvedImageUrl), we fetch them now.
        // We modify the tripPlan object in place before generating HTML.
        await resolveImagesForTripPlan(tripPlan as TripPlan);

        // Note: dayPlan is a subset of tripPlan, but it's passed separately in the request body.
        // It's safer to not rely on dayPlan having images if tripPlan was mutated.
        // However, if we mutated tripPlan's internal objects, and dayPlan refers to the same objects... wait.
        // The dayPlan in body is likely a separate copy or reference.
        // To be safe, if type === 'day', we should also resolve images for dayPlan explicitly 
        // OR just re-extract the relevant day from the now-hydrated tripPlan.

        let targetDayPlan = dayPlan;
        if (type === 'day' && dayPlan) {
            // Find corresponding day in hydrated tripPlan to ensure it has images
            const foundDay = (tripPlan as TripPlan).timeline.find(d => d.day === dayPlan.day);
            if (foundDay) {
                targetDayPlan = foundDay;
            }
        }

        // 1. 生成 HTML
        let fullHtml = '';
        try {
            fullHtml = generateExportHtml(type, tripPlan as TripPlan, targetDayPlan as TripPlanDay);
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
                timeout: 60000 // Increased timeout for images
            });

            console.log('[Export API] Waiting for resources...');
            await page.waitForFunction('window.isReadyForExport === true', { timeout: 30000 }).catch(() => {
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
