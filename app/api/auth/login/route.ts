import { NextRequest, NextResponse } from 'next/server';

// 强制动态渲染
export const dynamic = 'force-dynamic';

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

interface NotionTitleProperty {
    title: Array<{ plain_text: string }>;
}

interface NotionPage {
    id: string;
    cover?: {
        type: 'external' | 'file';
        external?: { url: string };
        file?: { url: string };
    } | null;
    properties: {
        Name?: NotionTitleProperty;
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

interface LoginResponse {
    success: boolean;
    user?: {
        id: string;
        name: string;
        unlockCode: string;
        status: 'VIP' | 'Active' | 'Banned';
        maxLimit: number;
        usedCount: number;
        avatarUrl?: string;
    };
    msg?: string;
}

/**
 * POST /api/auth/login
 * 用户登录接口 - 通过解锁码登录，返回用户信息
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { code } = body;

        if (!code || typeof code !== 'string' || code.trim() === '') {
            return NextResponse.json(
                { success: false, msg: '请输入解锁码' } as LoginResponse,
                { status: 400 }
            );
        }

        const trimmedCode = code.trim();

        const notionToken = process.env.NOTION_TOKEN || process.env.NOTION_API_KEY;
        const databaseId = process.env.NOTION_UNLOCK_DATABASE_ID;

        if (!notionToken || !databaseId) {
            console.error('Missing NOTION_TOKEN or NOTION_UNLOCK_DATABASE_ID');
            return NextResponse.json(
                { success: false, msg: '服务配置错误' } as LoginResponse,
                { status: 500 }
            );
        }

        // 查询用户
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
                { success: false, msg: '登录服务暂时不可用' } as LoginResponse,
                { status: 500 }
            );
        }

        const queryResult: NotionQueryResponse = await queryResponse.json();

        if (!queryResult.results || queryResult.results.length === 0) {
            return NextResponse.json(
                { success: false, msg: '无效的解锁码' } as LoginResponse,
                { status: 404 }
            );
        }

        const page = queryResult.results[0];

        // 提取用户信息
        const nameProp = page.properties.Name as NotionTitleProperty | undefined;
        const statusProp = page.properties.Status as NotionSelectProperty | undefined;
        const usedCountProp = page.properties.UsedCount as NotionNumberProperty | undefined;
        const maxLimitProp = page.properties.MaxLimit as NotionNumberProperty | undefined;

        const name = nameProp?.title?.[0]?.plain_text || '旅行者';
        const status = (statusProp?.select?.name as 'VIP' | 'Active' | 'Banned') || 'Active';
        const usedCount = usedCountProp?.number ?? 0;
        const maxLimit = maxLimitProp?.number ?? 10;

        // 检查封禁状态
        if (status === 'Banned') {
            return NextResponse.json(
                { success: false, msg: '此账号已被封禁' } as LoginResponse,
                { status: 403 }
            );
        }

        // 获取头像 URL (从封面)
        let avatarUrl: string | undefined;
        if (page.cover) {
            if (page.cover.type === 'external' && page.cover.external?.url) {
                avatarUrl = page.cover.external.url;
            } else if (page.cover.type === 'file' && page.cover.file?.url) {
                avatarUrl = page.cover.file.url;
            }
        }

        const user = {
            id: page.id,
            name,
            unlockCode: trimmedCode,
            status,
            maxLimit,
            usedCount,
            avatarUrl,
        };

        return NextResponse.json(
            { success: true, user } as LoginResponse,
            { status: 200 }
        );

    } catch (error) {
        console.error('Login API error:', error);
        return NextResponse.json(
            { success: false, msg: '服务器内部错误' } as LoginResponse,
            { status: 500 }
        );
    }
}

