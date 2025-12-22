import { NextRequest } from 'next/server';

// 强制动态渲染
export const dynamic = 'force-dynamic';

// 扣减用户使用次数
async function decrementUserUsage(userId: string): Promise<boolean> {
    const notionToken = process.env.NOTION_TOKEN || process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_UNLOCK_DATABASE_ID;

    if (!notionToken || !databaseId) {
        console.error('Missing Notion config for user update');
        return false;
    }

    try {
        // 先获取用户当前信息
        const pageResponse = await fetch(
            `https://api.notion.com/v1/pages/${userId}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${notionToken}`,
                    'Notion-Version': '2022-06-28',
                },
                cache: 'no-store',
            }
        );

        if (!pageResponse.ok) {
            console.error('Failed to get user page');
            return false;
        }

        const pageData = await pageResponse.json();
        const status = pageData.properties?.Status?.select?.name;
        const currentUsedCount = pageData.properties?.UsedCount?.number ?? 0;

        // VIP 用户不扣减
        if (status === 'VIP') {
            return true;
        }

        // 更新 UsedCount
        const updateResponse = await fetch(
            `https://api.notion.com/v1/pages/${userId}`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${notionToken}`,
                    'Content-Type': 'application/json',
                    'Notion-Version': '2022-06-28',
                },
                body: JSON.stringify({
                    properties: {
                        UsedCount: {
                            number: currentUsedCount + 1,
                        },
                    },
                }),
                cache: 'no-store',
            }
        );

        return updateResponse.ok;
    } catch (error) {
        console.error('Failed to decrement user usage:', error);
        return false;
    }
}

// 在旅行规划数据库中关联用户
async function linkTripToUser(tripPageId: string, userId: string): Promise<boolean> {
    const notionToken = process.env.NOTION_TOKEN || process.env.NOTION_API_KEY;

    if (!notionToken) {
        console.error('Missing Notion token');
        return false;
    }

    try {
        const updateResponse = await fetch(
            `https://api.notion.com/v1/pages/${tripPageId}`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${notionToken}`,
                    'Content-Type': 'application/json',
                    'Notion-Version': '2022-06-28',
                },
                body: JSON.stringify({
                    properties: {
                        User: {
                            relation: [{ id: userId }],
                        },
                    },
                }),
                cache: 'no-store',
            }
        );

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error('Failed to link trip to user:', errorText);
        }

        return updateResponse.ok;
    } catch (error) {
        console.error('Failed to link trip to user:', error);
        return false;
    }
}

export async function POST(request: NextRequest) {
    const encoder = new TextEncoder();

    // 节点名称映射表
    const NODE_MAPPING: Record<string, string> = {
        "开始": "正在分析您的旅行偏好...",
        "需求理解": "正在分析您的旅行偏好...",
        "景点规划": "正在搜罗全网热门景点...",
        "餐厅规划": "正在寻找本地必吃美食...",
        "信息整合": "正在编排每日最佳路线...",
        "json清洗": "正在格式化行程数据...",
        "数据清洗": "正在进行数据结构化处理...",
        "代码执行": "正在保存数据...",
        "数据写入": "正在生成最终行程报告...",
    };

    // 创建流式响应
    const stream = new ReadableStream({
        async start(controller) {
            // 辅助函数：向前端发送数据
            const sendToClient = (text: string) => {
                try {
                    controller.enqueue(encoder.encode(text));
                } catch (e) {
                    console.error('Error sending to client:', e);
                }
            };

            // 心跳定时器
            let heartbeatTimer: NodeJS.Timeout | null = null;
            const startHeartbeat = () => {
                if (heartbeatTimer) clearInterval(heartbeatTimer);
                heartbeatTimer = setInterval(() => {
                    sendToClient("HEARTBEAT\n");
                }, 4000);
            };

            const stopHeartbeat = () => {
                if (heartbeatTimer) {
                    clearInterval(heartbeatTimer);
                    heartbeatTimer = null;
                }
            };

            try {
                const body = await request.json();
                const { context, userId } = body;

                if (!context || typeof context !== 'string') {
                    sendToClient("PROGRESS:请输入您的旅行需求\n");
                    controller.close();
                    return;
                }

                const apiUrl = process.env.DIFY_API_URL;
                const apiKey = process.env.DIFY_API_KEY;

                if (!apiUrl || !apiKey) {
                    console.error('Missing Dify config');
                    sendToClient("PROGRESS:系统配置错误\n");
                    controller.close();
                    return;
                }

                // 如果有用户ID，先扣减使用次数
                if (userId) {
                    const decremented = await decrementUserUsage(userId);
                    if (!decremented) {
                        console.warn('Failed to decrement user usage, but continuing...');
                    }
                }

                startHeartbeat();

                // 初始状态
                sendToClient("PROGRESS:正在连接 AI 服务...\n");

                // 构建 inputs 对象，包含 context 和 User_id（如果存在）
                const inputs: Record<string, string> = { context };
                if (userId) {
                    inputs.User_id = userId;
                }

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        inputs,
                        response_mode: 'streaming',
                        user: userId || 'travel-ai-user',
                    }),
                });

                if (!response.ok) {
                    sendToClient("PROGRESS:服务繁忙，请稍后重试\n");
                    stopHeartbeat();
                    controller.close();
                    return;
                }

                const reader = response.body?.getReader();
                if (!reader) {
                    stopHeartbeat();
                    controller.close();
                    return;
                }

                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    buffer += chunk;

                    const lines = buffer.split('\n\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const jsonStr = line.slice(6).trim();
                                if (!jsonStr) continue;

                                const data = JSON.parse(jsonStr);
                                const event = data.event;

                                if (event === 'node_started') {
                                    const nodeName = data.data?.title || '';
                                    const message = NODE_MAPPING[nodeName] || "AI 正在思考中...";
                                    sendToClient(`PROGRESS:${message}\n`);
                                    startHeartbeat();
                                }
                                else if (event === 'workflow_finished') {
                                    const workflowRunId = data.workflow_run_id;

                                    // 如果有用户ID，尝试关联旅行记录到用户
                                    // 注意：workflowRunId 可能不是 Notion page ID
                                    // 需要根据实际情况处理
                                    // 这里假设 Dify 返回的数据会写入 Notion，我们在写入后关联
                                    if (userId && workflowRunId) {
                                        // 延迟一下等待 Notion 写入完成
                                        setTimeout(async () => {
                                            // 查找对应的 Notion page 并关联用户
                                            await linkTripByWorkflowRunId(workflowRunId, userId);
                                        }, 2000);
                                    }

                                    sendToClient(`DONE:${workflowRunId}\n`);
                                    stopHeartbeat();
                                    controller.close();
                                    return;
                                }

                            } catch (e) {
                                console.warn('JSON parse error:', e);
                            }
                        }
                    }
                }

                stopHeartbeat();
                controller.close();

            } catch (error) {
                console.error('Stream error:', error);
                stopHeartbeat();
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}

// 根据 workflow_run_id 查找并关联用户
async function linkTripByWorkflowRunId(workflowRunId: string, userId: string): Promise<boolean> {
    const notionToken = process.env.NOTION_TOKEN || process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_DATABASE_ID;

    if (!notionToken || !databaseId) {
        return false;
    }

    try {
        // 查询包含该 workflow_run_id 的页面
        const queryResponse = await fetch(
            `https://api.notion.com/v1/databases/${databaseId}/query`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${notionToken}`,
                    'Content-Type': 'application/json',
                    'Notion-Version': '2022-06-28',
                },
                body: JSON.stringify({
                    filter: {
                        property: 'workflow_run_id',
                        rich_text: {
                            equals: workflowRunId,
                        },
                    },
                    page_size: 1,
                }),
                cache: 'no-store',
            }
        );

        if (!queryResponse.ok) {
            return false;
        }

        const queryResult = await queryResponse.json();
        if (queryResult.results && queryResult.results.length > 0) {
            const tripPageId = queryResult.results[0].id;
            return await linkTripToUser(tripPageId, userId);
        }

        return false;
    } catch (error) {
        console.error('Failed to link trip by workflow_run_id:', error);
        return false;
    }
}
