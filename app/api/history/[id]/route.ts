import { NextRequest, NextResponse } from 'next/server';

interface NotionPage {
    id: string;
    properties: {
        PlanJSON?: {
            rich_text: Array<{ plain_text: string }>;
        };
        [key: string]: any;
    };
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

        const planJsonStr = planJsonProp.rich_text[0].plain_text;

        // 解析 JSON 字符串
        let planData;
        try {
            planData = JSON.parse(planJsonStr);
        } catch {
            console.error('Failed to parse PlanJSON:', planJsonStr.substring(0, 200));
            return NextResponse.json(
                { error: '行程数据格式错误' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: planData,
        });

    } catch (error) {
        console.error('History detail API error:', error);
        return NextResponse.json(
            { error: '服务器内部错误' },
            { status: 500 }
        );
    }
}
