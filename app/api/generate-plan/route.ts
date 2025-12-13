import { NextRequest } from 'next/server';

// 强制动态渲染
export const dynamic = 'force-dynamic';

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
                }, 4000); // 每4秒发送一次心跳
            };

            const stopHeartbeat = () => {
                if (heartbeatTimer) {
                    clearInterval(heartbeatTimer);
                    heartbeatTimer = null;
                }
            };

            try {
                const body = await request.json();
                const { context } = body;

                if (!context || typeof context !== 'string') {
                    // 发送错误并不是这里的标准流程，前端通过 PROGRESS 显示
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

                startHeartbeat();

                // 初始状态
                sendToClient("PROGRESS:正在连接 AI 服务...\n");

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        inputs: { context },
                        response_mode: 'streaming',
                        user: 'travel-ai-user',
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

                    // 处理 Dify 的 SSE 数据
                    // Dify 返回的数据通常是 data: {...}\n\n
                    // 可能跨包，所以需要 buffer
                    const lines = buffer.split('\n\n');
                    buffer = lines.pop() || ''; // 保留最后一个可能不完整的部分

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const jsonStr = line.slice(6).trim();
                                if (!jsonStr) continue;

                                const data = JSON.parse(jsonStr);
                                const event = data.event;

                                if (event === 'node_started') {
                                    const nodeName = data.data?.title || '';
                                    // 优先使用映射表，否则使用默认文案
                                    const message = NODE_MAPPING[nodeName] || "AI 正在思考中...";
                                    sendToClient(`PROGRESS:${message}\n`);

                                    // 重置心跳计时器
                                    startHeartbeat();
                                }
                                else if (event === 'workflow_finished') {
                                    const workflowRunId = data.workflow_run_id;
                                    sendToClient(`DONE:${workflowRunId}\n`);
                                    stopHeartbeat();
                                    controller.close();
                                    return; // 结束处理
                                }
                                else {
                                    // 收到任何数据都算心跳，可以重置计时器
                                    // startHeartbeat(); 
                                    // 可选：如果觉得 4s 太长，也可以在这里发 HEARTBEAT
                                }

                            } catch (e) {
                                // JSON 解析失败，忽略，继续处理下一个
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
