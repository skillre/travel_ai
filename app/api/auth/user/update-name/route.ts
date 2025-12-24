import { NextRequest, NextResponse } from 'next/server';

// 强制动态渲染
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/user/update-name
 * 更新用户名接口 - 同步到 Notion 数据库的 user_name 字段
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, userName } = body;

        if (!userId || typeof userId !== 'string') {
            return NextResponse.json(
                { success: false, msg: '缺少用户ID' },
                { status: 400 }
            );
        }

        if (!userName || typeof userName !== 'string' || userName.trim() === '') {
            return NextResponse.json(
                { success: false, msg: '用户名不能为空' },
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

        const trimmedUserName = userName.trim();

        // 更新 Notion 页面的 user_name 字段
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
                        user_name: {
                            rich_text: [
                                {
                                    text: {
                                        content: trimmedUserName,
                                    },
                                },
                            ],
                        },
                    },
                }),
                cache: 'no-store',
            }
        );

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error('Notion update user_name error:', updateResponse.status, errorText);
            
            // 尝试解析错误信息
            try {
                const errorData = JSON.parse(errorText);
                const errorMessage = errorData.message || '更新失败';
                
                // 检查是否是字段不存在
                if (errorMessage.includes('property') || errorMessage.includes('not found')) {
                    return NextResponse.json(
                        { success: false, msg: '数据库字段配置错误，请检查 user_name 字段是否存在' },
                        { status: 500 }
                    );
                }
            } catch (parseError) {
                // 解析错误失败，使用默认消息
            }

            return NextResponse.json(
                { success: false, msg: '更新失败，请稍后重试' },
                { status: 500 }
            );
        }

        // 验证更新是否成功：重新查询用户信息
        const verifyResponse = await fetch(
            `https://api.notion.com/v1/pages/${userId}`,
            {
                headers: {
                    'Authorization': `Bearer ${notionToken}`,
                    'Notion-Version': '2022-06-28',
                },
                cache: 'no-store',
            }
        );

        if (verifyResponse.ok) {
            const page = await verifyResponse.json();
            const userNameProp = page.properties?.user_name;
            const savedName = userNameProp?.rich_text?.[0]?.plain_text || '';
            
            if (savedName === trimmedUserName) {
                // 验证成功
                return NextResponse.json(
                    { success: true, userName: trimmedUserName },
                    { status: 200 }
                );
            } else {
                // 验证失败：保存的值与预期不符
                console.error('User name verification failed:', { expected: trimmedUserName, actual: savedName });
                return NextResponse.json(
                    { success: false, msg: '保存失败，请重新设置' },
                    { status: 500 }
                );
            }
        } else {
            // 验证请求失败，但更新可能已成功
            console.warn('Failed to verify user name update, but update may have succeeded');
            return NextResponse.json(
                { success: true, userName: trimmedUserName, warning: '验证失败，但更新可能已成功' },
                { status: 200 }
            );
        }

    } catch (error) {
        console.error('Update user name API error:', error);
        return NextResponse.json(
            { success: false, msg: '服务器内部错误' },
            { status: 500 }
        );
    }
}

