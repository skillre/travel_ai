import { NextRequest, NextResponse } from 'next/server';

// 强制动态渲染
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/avatar/update-notion
 * 同步头像 URL 到 Notion 数据库
 * 更新 Cover 字段和 Sculpture_head 字段（备份）
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, publicUrl } = body;

        if (!userId || typeof userId !== 'string') {
            return NextResponse.json(
                { success: false, msg: '缺少用户ID' },
                { status: 400 }
            );
        }

        if (!publicUrl || typeof publicUrl !== 'string') {
            return NextResponse.json(
                { success: false, msg: '缺少头像 URL' },
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

        // 更新 Notion 页面
        // 1. 更新 Cover（封面）字段
        // 2. 更新 Sculpture_head 字段（作为备份）
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
                            url: publicUrl,
                        },
                    },
                    properties: {
                        // 更新 Sculpture_head 字段（Files 类型，格式必须严格如下）
                        Sculpture_head: {
                            files: [
                                {
                                    name: 'avatar.jpg', // 显示文件名
                                    type: 'external',   // 必须填 external
                                    external: {
                                        url: publicUrl  // 阿里云 OSS 的 HTTPS 链接
                                    }
                                }
                            ]
                        },
                    },
                }),
                cache: 'no-store',
            }
        );

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error('Notion update avatar error:', updateResponse.status, errorText);
            
            // 尝试解析错误信息
            try {
                const errorData = JSON.parse(errorText);
                const errorMessage = errorData.message || '更新失败';
                console.error('[Avatar Update Notion] 错误详情:', {
                    status: updateResponse.status,
                    code: errorData.code,
                    message: errorMessage,
                });
                
                // 检查是否是字段不存在或格式错误（Sculpture_head 字段可能不存在，这是可选的）
                if (errorMessage.includes('Sculpture_head') && 
                    (errorMessage.includes('not found') || errorMessage.includes('expected to be'))) {
                    // 如果 Sculpture_head 字段不存在或格式不对，只更新 Cover
                    console.warn('Sculpture_head field issue detected, only updating Cover');
                    
                    const coverOnlyResponse = await fetch(
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
                                        url: publicUrl,
                                    },
                                },
                            }),
                            cache: 'no-store',
                        }
                    );

                    if (coverOnlyResponse.ok) {
                        return NextResponse.json(
                            { success: true, avatarUrl: publicUrl, warning: 'Sculpture_head 字段未正确配置，仅更新了 Cover' },
                            { status: 200 }
                        );
                    }
                }
            } catch (parseError) {
                // 解析错误失败，使用默认消息
                console.error('[Avatar Update Notion] 解析错误信息失败:', parseError);
            }

            return NextResponse.json(
                { success: false, msg: '更新失败，请稍后重试' },
                { status: 500 }
            );
        }

        // 验证更新是否成功
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
            const coverUrl = page.cover?.external?.url || page.cover?.file?.url || '';
            
            if (coverUrl === publicUrl) {
                // 验证成功
                return NextResponse.json(
                    { success: true, avatarUrl: publicUrl },
                    { status: 200 }
                );
            } else {
                // 验证失败：保存的值与预期不符
                console.error('Avatar verification failed:', { expected: publicUrl, actual: coverUrl });
                return NextResponse.json(
                    { success: false, msg: '保存失败，请重新设置' },
                    { status: 500 }
                );
            }
        } else {
            // 验证请求失败，但更新可能已成功
            console.warn('Failed to verify avatar update, but update may have succeeded');
            return NextResponse.json(
                { success: true, avatarUrl: publicUrl, warning: '验证失败，但更新可能已成功' },
                { status: 200 }
            );
        }

    } catch (error) {
        console.error('Update avatar Notion API error:', error);
        return NextResponse.json(
            { success: false, msg: '服务器内部错误' },
            { status: 500 }
        );
    }
}

