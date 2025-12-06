import { NextRequest, NextResponse } from 'next/server';

interface NotionPage {
    id: string;
    properties: {
        Title?: {
            title: Array<{ plain_text: string }>;
        };
        PlanJSON?: {
            rich_text: Array<{ plain_text: string }>;
        };
        [key: string]: any;
    };
}

/**
 * 将 Python 风格的字符串（单引号）转换为标准 JSON（双引号）
 */
function pythonToJson(pythonStr: string): string {
    // 先处理转义的单引号
    let result = pythonStr;

    // 替换单引号为双引号
    // 注意：需要处理值中包含的单引号（如 "Tom's cafe"）
    result = result.replace(/'/g, '"');

    // 处理 Python 的 True/False/None
    result = result.replace(/\bTrue\b/g, 'true');
    result = result.replace(/\bFalse\b/g, 'false');
    result = result.replace(/\bNone\b/g, 'null');

    return result;
}

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const pageId = params.id;

        if (!pageId) {
            return NextResponse.json(
                { error: '缺少页面 ID' },
                { status: 400 }
            );
        }

        const notionKey = process.env.NOTION_API_KEY;

        if (!notionKey) {
            console.error('Missing NOTION_API_KEY');
            return NextResponse.json(
                { error: 'Notion 配置错误' },
                { status: 500 }
            );
        }

        // 获取 Notion 页面
        const response = await fetch(
            `https://api.notion.com/v1/pages/${pageId}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${notionKey}`,
                    'Notion-Version': '2022-06-28',
                },
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Notion API error:', response.status, errorText);
            return NextResponse.json(
                { error: '获取记录详情失败' },
                { status: response.status }
            );
        }

        const page: NotionPage = await response.json();

        // 解析 PlanJSON 字段
        const planJsonProp = page.properties.PlanJSON;
        if (!planJsonProp?.rich_text?.[0]?.plain_text) {
            return NextResponse.json(
                { error: '该记录没有行程数据' },
                { status: 404 }
            );
        }

        // 获取完整的 PlanJSON 字符串（可能分布在多个 rich_text 块中）
        let planJsonStr = '';
        for (const textBlock of planJsonProp.rich_text) {
            if (textBlock.plain_text) {
                planJsonStr += textBlock.plain_text;
            }
        }

        // 解析 JSON 字符串
        let planData;
        try {
            // 首先尝试直接解析（标准 JSON）
            planData = JSON.parse(planJsonStr);
        } catch {
            // 如果失败，尝试将 Python 格式转换为 JSON
            try {
                const jsonStr = pythonToJson(planJsonStr);
                planData = JSON.parse(jsonStr);
            } catch (parseError) {
                console.error('Failed to parse PlanJSON:', planJsonStr.substring(0, 500));
                console.error('Parse error:', parseError);
                return NextResponse.json(
                    { error: '行程数据格式错误，无法解析' },
                    { status: 500 }
                );
            }
        }

        // 获取标题
        let title = '';
        const titleProp = page.properties.Title || page.properties.Name;
        if (titleProp?.title?.[0]?.plain_text) {
            title = titleProp.title[0].plain_text;
        }

        return NextResponse.json({
            success: true,
            data: planData,
            title: title,
        });

    } catch (error) {
        console.error('History detail API error:', error);
        return NextResponse.json(
            { error: '服务器内部错误' },
            { status: 500 }
        );
    }
}
