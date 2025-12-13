import { NextRequest, NextResponse } from 'next/server';

// 强制动态渲染
export const dynamic = 'force-dynamic';

// 响应类型定义
interface VerifyResponse {
    valid: boolean;
    type?: 'VIP' | 'TRIAL';
    remaining?: number;
    msg?: string;
}

// Notion 属性类型
interface NotionSelectProperty {
    select: { name: string } | null;
}

interface NotionNumberProperty {
    number: number | null;
}

interface NotionRichTextProperty {
    rich_text: Array<{ plain_text: string }>;
}

interface NotionPage {
    id: string;
    properties: {
        UnlockCode?: NotionRichTextProperty;
        Status?: NotionSelectProperty;
        UsedCount?: NotionNumberProperty;
        MaxLimit?: NotionNumberProperty;
        [key: string]: any;
    };
}

interface NotionQueryResponse {
    results: NotionPage[];
    has_more: boolean;
}

/**
 * POST /api/verify-code
 * 解锁码验证接口 - 带计数限制的验证逻辑
 */
export async function POST(request: NextRequest) {
    try {
        // 解析请求体
        const body = await request.json();
        const { code } = body;

        // 验证输入
        if (!code || typeof code !== 'string' || code.trim() === '') {
            return NextResponse.json(
                { valid: false, msg: '请输入解锁码' } as VerifyResponse,
                { status: 400 }
            );
        }

        const trimmedCode = code.trim();

        // 获取环境变量
        const notionToken = process.env.NOTION_TOKEN || process.env.NOTION_API_KEY;
        const databaseId = process.env.NOTION_UNLOCK_DATABASE_ID;

        if (!notionToken || !databaseId) {
            console.error('Missing NOTION_TOKEN or NOTION_UNLOCK_DATABASE_ID');
            return NextResponse.json(
                { valid: false, msg: '服务配置错误' } as VerifyResponse,
                { status: 500 }
            );
        }

        // 1. Query: 在 Notion DB 中查找 UnlockCode 等于输入 code 的页面
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
                        property: 'UnlockCode',
                        rich_text: {
                            equals: trimmedCode,
                        },
                    },
                    page_size: 1,
                }),
                cache: 'no-store',
            }
        );

        if (!queryResponse.ok) {
            const errorText = await queryResponse.text();
            console.error('Notion query error:', queryResponse.status, errorText);
            return NextResponse.json(
                { valid: false, msg: '验证服务暂时不可用' } as VerifyResponse,
                { status: 500 }
            );
        }

        const queryResult: NotionQueryResponse = await queryResponse.json();

        // 2. Not Found: 如果没找到，返回 404
        if (!queryResult.results || queryResult.results.length === 0) {
            return NextResponse.json(
                { valid: false, msg: '无效的解锁码' } as VerifyResponse,
                { status: 404 }
            );
        }

        const page = queryResult.results[0];
        const pageId = page.id;

        // 3. Check Status: 获取页面属性
        const statusProp = page.properties.Status as NotionSelectProperty | undefined;
        const usedCountProp = page.properties.UsedCount as NotionNumberProperty | undefined;
        const maxLimitProp = page.properties.MaxLimit as NotionNumberProperty | undefined;

        const status = statusProp?.select?.name || 'Active';
        const usedCount = usedCountProp?.number ?? 0;
        const maxLimit = maxLimitProp?.number ?? 10; // 默认上限 10 次

        // VIP 用户: 直接返回 (不扣次数)
        if (status === 'VIP') {
            return NextResponse.json(
                { valid: true, type: 'VIP' } as VerifyResponse,
                { status: 200 }
            );
        }

        // Banned 用户: 返回封禁提示
        if (status === 'Banned') {
            return NextResponse.json(
                { valid: false, msg: '此码已被封禁' } as VerifyResponse,
                { status: 200 }
            );
        }

        // Active (免费) 用户: 检查限制
        if (usedCount >= maxLimit) {
            // 次数用尽
            return NextResponse.json(
                { valid: false, msg: '试用验证次数已用尽，请获取新码或升级' } as VerifyResponse,
                { status: 200 }
            );
        }

        // 4. Increment Logic (扣减): 更新 UsedCount +1
        const newUsedCount = usedCount + 1;
        const remaining = maxLimit - newUsedCount;

        const updateResponse = await fetch(
            `https://api.notion.com/v1/pages/${pageId}`,
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
                            number: newUsedCount,
                        },
                    },
                }),
                cache: 'no-store',
            }
        );

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error('Notion update error:', updateResponse.status, errorText);
            // 即使更新失败，也返回验证成功（避免阻塞用户）
            // 但记录日志以便排查
            return NextResponse.json(
                { valid: true, type: 'TRIAL', remaining: maxLimit - usedCount - 1 } as VerifyResponse,
                { status: 200 }
            );
        }

        // 更新成功，返回验证结果
        return NextResponse.json(
            { valid: true, type: 'TRIAL', remaining } as VerifyResponse,
            { status: 200 }
        );

    } catch (error) {
        console.error('Verify code API error:', error);
        return NextResponse.json(
            { valid: false, msg: '服务器内部错误' } as VerifyResponse,
            { status: 500 }
        );
    }
}
