import { NextRequest, NextResponse } from 'next/server';

interface NotionPage {
    id: string;
    properties: {
        Name?: {
            title: Array<{ plain_text: string }>;
        };
        PlanJSON?: {
            rich_text: Array<{ plain_text: string }>;
        };
        workflow_run_id?: {
            rich_text: Array<{ plain_text: string }>;
        };
        Created?: {
            created_time: string;
        };
        [key: string]: any;
    };
    created_time: string;
}

interface NotionResponse {
    results: NotionPage[];
    has_more: boolean;
    next_cursor: string | null;
}

export async function GET(request: NextRequest) {
    try {
        const notionKey = process.env.NOTION_API_KEY;
        const databaseId = process.env.NOTION_DATABASE_ID;

        if (!notionKey || !databaseId) {
            console.error('Missing NOTION_API_KEY or NOTION_DATABASE_ID');
            return NextResponse.json(
                { error: 'Notion 配置错误' },
                { status: 500 }
            );
        }

        // 查询 Notion 数据库
        const response = await fetch(
            `https://api.notion.com/v1/databases/${databaseId}/query`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${notionKey}`,
                    'Content-Type': 'application/json',
                    'Notion-Version': '2022-06-28',
                },
                body: JSON.stringify({
                    page_size: 50,
                    sorts: [
                        {
                            timestamp: 'created_time',
                            direction: 'descending',
                        },
                    ],
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Notion API error:', response.status, errorText);
            return NextResponse.json(
                { error: '获取历史记录失败' },
                { status: response.status }
            );
        }

        const data: NotionResponse = await response.json();

        // 格式化返回数据
        const records = data.results.map((page) => {
            // 获取标题 - 优先使用 Title 字段
            let title = '未命名行程';
            const titleProp = page.properties.Title || page.properties.Name || page.properties['名称'];
            if (titleProp?.title?.[0]?.plain_text) {
                title = titleProp.title[0].plain_text;
            }

            // 获取 workflow_run_id
            let workflowRunId = '';
            const runIdProp = page.properties.workflow_run_id || page.properties.WorkflowRunId;
            if (runIdProp?.rich_text?.[0]?.plain_text) {
                workflowRunId = runIdProp.rich_text[0].plain_text;
            }

            // 检查是否有 PlanJSON
            let hasPlanData = false;
            const planJsonProp = page.properties.PlanJSON;
            if (planJsonProp?.rich_text?.[0]?.plain_text) {
                hasPlanData = true;
            }

            return {
                id: page.id,
                title,
                workflow_run_id: workflowRunId,
                has_plan_data: hasPlanData,
                created_time: page.created_time,
            };
        });

        return NextResponse.json({
            success: true,
            records,
        });

    } catch (error) {
        console.error('History API error:', error);
        return NextResponse.json(
            { error: '服务器内部错误' },
            { status: 500 }
        );
    }
}
