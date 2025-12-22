import { NextRequest, NextResponse } from 'next/server';

// 强制动态渲染
export const dynamic = 'force-dynamic';

interface NotionPage {
    id: string;
    properties: {
        Name?: {
            title: Array<{ plain_text: string }>;
        };
        Title?: {
            title: Array<{ plain_text: string }>;
        };
        PlanJSON?: {
            rich_text: Array<{ plain_text: string }>;
        };
        workflow_run_id?: {
            rich_text: Array<{ plain_text: string }>;
        };
        WorkflowRunId?: {
            rich_text: Array<{ plain_text: string }>;
        };
        User?: {
            relation: Array<{ id: string }>;
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

        // 从查询参数获取用户ID
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        // 构建过滤条件
        // 如果有 userId，返回该用户的记录 + 无用户的公共记录
        // 如果没有 userId（未登录），只返回无用户的公共记录
        let filter: any;

        if (userId) {
            // 已登录用户：显示自己的记录 + 公共记录（User 为空）
            filter = {
                or: [
                    {
                        property: 'User',
                        relation: {
                            contains: userId,
                        },
                    },
                    {
                        property: 'User',
                        relation: {
                            is_empty: true,
                        },
                    },
                ],
            };
        } else {
            // 未登录用户：只显示公共记录（User 为空）
            filter = {
                property: 'User',
                relation: {
                    is_empty: true,
                },
            };
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
                    filter,
                    page_size: 50,
                    sorts: [
                        {
                            timestamp: 'created_time',
                            direction: 'descending',
                        },
                    ],
                }),
                cache: 'no-store',
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

            // 获取关联的用户ID
            const userRelation = page.properties.User?.relation;
            const ownerId = userRelation && userRelation.length > 0 ? userRelation[0].id : null;

            return {
                id: page.id,
                title,
                workflow_run_id: workflowRunId,
                has_plan_data: hasPlanData,
                created_time: page.created_time,
                is_public: !ownerId, // 是否为公共记录
                is_own: ownerId === userId, // 是否为自己的记录
            };
        });

        return NextResponse.json({
            success: true,
            records,
        }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
            },
        });

    } catch (error) {
        console.error('History API error:', error);
        return NextResponse.json(
            { error: '服务器内部错误' },
            { status: 500 }
        );
    }
}
