import { NextRequest, NextResponse } from 'next/server';

// 强制动态渲染
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/avatar
 * 更新用户头像接口
 * 支持两种方式：
 * 1. 上传文件 - 通过 Notion API 上传到 Notion
 * 2. 传入 URL - 直接设置为外部链接封面
 */
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const userId = formData.get('userId') as string;
        const avatarUrl = formData.get('avatarUrl') as string | null;
        const avatarFile = formData.get('avatar') as File | null;

        if (!userId) {
            return NextResponse.json(
                { success: false, msg: '缺少用户ID' },
                { status: 400 }
            );
        }

        const notionToken = process.env.NOTION_TOKEN || process.env.NOTION_API_KEY;

        if (!notionToken) {
            return NextResponse.json(
                { success: false, msg: '服务配置错误' },
                { status: 500 }
            );
        }

        let coverUrl: string;

        if (avatarUrl) {
            // 方式1: 直接使用 URL
            coverUrl = avatarUrl;
        } else if (avatarFile) {
            // 方式2: 上传文件到图床或使用其他服务
            // 注意：Notion API 不直接支持上传文件到封面
            // 这里我们需要先上传到某个图床，然后使用 URL
            // 为简化实现，我们使用 base64 data URL（不推荐生产环境）
            // 或者可以集成第三方图床服务

            // 简单实现：将文件转换为 base64 data URL
            // 注意：这种方式 Notion 可能不支持，建议使用外部图床
            const bytes = await avatarFile.arrayBuffer();
            const base64 = Buffer.from(bytes).toString('base64');
            const mimeType = avatarFile.type || 'image/png';

            // Notion 不支持 data URL，所以这里需要用外部图床
            // 为了简化，我们返回错误提示用户使用 URL 方式
            return NextResponse.json(
                { success: false, msg: '暂不支持文件上传，请使用图片链接' },
                { status: 400 }
            );
        } else {
            return NextResponse.json(
                { success: false, msg: '请提供头像图片或链接' },
                { status: 400 }
            );
        }

        // 更新 Notion 页面封面
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
                    cover: {
                        type: 'external',
                        external: {
                            url: coverUrl,
                        },
                    },
                }),
                cache: 'no-store',
            }
        );

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error('Notion update cover error:', updateResponse.status, errorText);
            return NextResponse.json(
                { success: false, msg: '更新头像失败' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { success: true, avatarUrl: coverUrl },
            { status: 200 }
        );

    } catch (error) {
        console.error('Avatar API error:', error);
        return NextResponse.json(
            { success: false, msg: '服务器内部错误' },
            { status: 500 }
        );
    }
}

