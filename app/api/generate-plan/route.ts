import { NextRequest } from 'next/server';

// 进度事件类型
type ProgressEvent = {
    type: 'progress';
    step: string;
    progress: number; // 0-100
    message: string;
} | {
    type: 'complete';
    data: any;
    workflow_run_id: string;
} | {
    type: 'error';
    error: string;
};

export async function POST(request: NextRequest) {
    const encoder = new TextEncoder();

    // 创建流式响应
    const stream = new ReadableStream({
        async start(controller) {
            const sendEvent = (event: ProgressEvent) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
            };

            try {
                const body = await request.json();
                const { context } = body;

                if (!context || typeof context !== 'string') {
                    sendEvent({ type: 'error', error: '请输入您的旅行需求' });
                    controller.close();
                    return;
                }

                const apiUrl = process.env.DIFY_API_URL;
                const apiKey = process.env.DIFY_API_KEY;

                if (!apiUrl || !apiKey) {
                    sendEvent({ type: 'error', error: '服务配置错误' });
                    controller.close();
                    return;
                }

                // 发送初始进度
                sendEvent({
                    type: 'progress',
                    step: 'connecting',
                    progress: 10,
                    message: '正在连接 AI 服务...'
                });

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
                    sendEvent({ type: 'error', error: '生成行程失败，请稍后重试' });
                    controller.close();
                    return;
                }

                sendEvent({
                    type: 'progress',
                    step: 'processing',
                    progress: 30,
                    message: '正在分析您的需求...'
                });

                const reader = response.body?.getReader();
                if (!reader) {
                    sendEvent({ type: 'error', error: '无法读取响应数据' });
                    controller.close();
                    return;
                }

                const decoder = new TextDecoder();
                let fullText = '';
                let lastProgress = 30;
                let result: any = null;

                // 读取流式数据
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    fullText += chunk;

                    // 更新进度 (30% -> 80%)
                    const textLength = fullText.length;
                    const estimatedProgress = Math.min(80, 30 + Math.floor(textLength / 100));

                    if (estimatedProgress > lastProgress + 5) {
                        lastProgress = estimatedProgress;

                        // 根据进度发送不同的消息
                        let message = '正在生成行程...';
                        if (estimatedProgress > 50) message = '正在优化路线...';
                        if (estimatedProgress > 70) message = '即将完成...';

                        sendEvent({
                            type: 'progress',
                            step: 'generating',
                            progress: estimatedProgress,
                            message
                        });
                    }
                }

                sendEvent({
                    type: 'progress',
                    step: 'parsing',
                    progress: 85,
                    message: '正在解析数据...'
                });

                // 解析响应
                const lines = fullText.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data:')) {
                        try {
                            const jsonStr = line.slice(5).trim();
                            if (jsonStr) {
                                const parsed = JSON.parse(jsonStr);
                                if (parsed.data?.outputs?.text) {
                                    result = parsed;
                                }
                            }
                        } catch {
                            // 继续处理下一行
                        }
                    } else if (line.trim().startsWith('{')) {
                        try {
                            const parsed = JSON.parse(line.trim());
                            if (parsed.data?.outputs?.text) {
                                result = parsed;
                            }
                        } catch {
                            // 继续处理
                        }
                    }
                }

                if (!result || !result.data?.outputs?.text) {
                    sendEvent({ type: 'error', error: '解析行程数据失败' });
                    controller.close();
                    return;
                }

                sendEvent({
                    type: 'progress',
                    step: 'finalizing',
                    progress: 95,
                    message: '正在整理行程...'
                });

                // 发送完成事件
                sendEvent({
                    type: 'complete',
                    data: result.data.outputs.text,
                    workflow_run_id: result.workflow_run_id || result.data?.id || ''
                });

                controller.close();

            } catch (error) {
                console.error('Generate plan error:', error);
                sendEvent({ type: 'error', error: '服务器内部错误' });
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
