import { NextRequest, NextResponse } from 'next/server';

interface DifyResponse {
    task_id: string;
    workflow_run_id: string;
    data: {
        id: string;
        workflow_id: string;
        status: string;
        outputs: {
            text: {
                city: string;
                total_days: number;
                trip_overview: string;
                daily_plan: Array<{
                    day: number;
                    routes: Array<{
                        name: string;
                        desc: string;
                        latitude: number;
                        longitude: number;
                    }>;
                }>;
            };
        };
        error: string | null;
        elapsed_time: number;
        total_tokens: number;
        total_steps: number;
        created_at: number;
        finished_at: number;
    };
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { context } = body;

        if (!context || typeof context !== 'string') {
            return NextResponse.json(
                { error: '请输入您的旅行需求' },
                { status: 400 }
            );
        }

        const apiUrl = process.env.DIFY_API_URL;
        const apiKey = process.env.DIFY_API_KEY;

        if (!apiUrl || !apiKey) {
            console.error('Missing DIFY_API_URL or DIFY_API_KEY environment variables');
            return NextResponse.json(
                { error: '服务配置错误，请联系管理员' },
                { status: 500 }
            );
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: {
                    context: context,
                },
                response_mode: 'streaming',
                user: 'travel-ai-user',
            }),
        });

        if (!response.ok) {
            console.error('Dify API error:', response.status, response.statusText);
            return NextResponse.json(
                { error: '生成行程失败，请稍后重试' },
                { status: response.status }
            );
        }

        // 处理 streaming 响应
        const reader = response.body?.getReader();
        if (!reader) {
            return NextResponse.json(
                { error: '无法读取响应数据' },
                { status: 500 }
            );
        }

        const decoder = new TextDecoder();
        let fullText = '';
        let result: DifyResponse | null = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            fullText += chunk;
        }

        // 解析 streaming 响应，查找包含完整数据的行
        const lines = fullText.split('\n');
        for (const line of lines) {
            if (line.startsWith('data:')) {
                try {
                    const jsonStr = line.slice(5).trim();
                    if (jsonStr) {
                        const parsed = JSON.parse(jsonStr);
                        // 查找包含 outputs 的响应
                        if (parsed.data?.outputs?.text) {
                            result = parsed;
                        }
                    }
                } catch {
                    // 继续处理下一行
                }
            } else if (line.trim().startsWith('{')) {
                // 尝试直接解析 JSON
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
            console.error('Failed to parse Dify response:', fullText.substring(0, 500));
            return NextResponse.json(
                { error: '解析行程数据失败' },
                { status: 500 }
            );
        }

        const tripData = result.data.outputs.text;
        const workflowRunId = result.workflow_run_id || result.data?.id;

        return NextResponse.json({
            success: true,
            data: tripData,
            workflow_run_id: workflowRunId,
        });

    } catch (error) {
        console.error('Generate plan error:', error);
        return NextResponse.json(
            { error: '服务器内部错误' },
            { status: 500 }
        );
    }
}
