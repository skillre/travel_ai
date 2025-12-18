
import { renderToStaticMarkup } from 'react-dom/server';
import { TripPlan, TripPlanDay } from '../types';
import TripCheatsheetView from '../components/TripCheatsheetView';
import TripRouteMapView from '../components/TripRouteMapView';
import DayDetailExportView from '../components/DayDetailExportView';

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

export function generateExportHtml(type: string, tripPlan: TripPlan, dayPlan?: TripPlanDay): string {
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
