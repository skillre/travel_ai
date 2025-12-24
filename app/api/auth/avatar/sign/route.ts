import { NextRequest, NextResponse } from 'next/server';
import OSS from 'ali-oss';

// 强制动态渲染
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/avatar/sign
 * 获取阿里云 OSS 上传凭证接口
 * 返回预签名 URL 和公共访问 URL
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, fileName, contentType } = body;

        if (!userId || typeof userId !== 'string') {
            return NextResponse.json(
                { success: false, msg: '缺少用户ID' },
                { status: 400 }
            );
        }

        // 验证用户身份（可选，如果需要的话）
        // 这里可以根据需要添加额外的身份验证逻辑

        // 获取环境变量
        const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
        const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;
        const bucketName = process.env.OSS_BUCKET_NAME;
        const region = process.env.OSS_REGION;
        const publicUrl = process.env.OSS_PUBLIC_URL;

        if (!accessKeyId || !accessKeySecret || !bucketName || !region || !publicUrl) {
            console.error('Missing OSS configuration:', {
                hasAccessKey: !!accessKeyId,
                hasSecretKey: !!accessKeySecret,
                hasBucket: !!bucketName,
                hasRegion: !!region,
                hasPublicUrl: !!publicUrl,
            });
            return NextResponse.json(
                { success: false, msg: '服务配置错误' },
                { status: 500 }
            );
        }

        // 生成唯一的文件路径
        // 格式: avatars/{userId}/{timestamp}-{random}.jpg
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const fileExtension = fileName?.split('.').pop() || 'jpg';
        const objectKey = `avatars/${userId}/${timestamp}-${random}.${fileExtension}`;

        // 创建 OSS 客户端
        const client = new OSS({
            accessKeyId,
            accessKeySecret,
            bucket: bucketName,
            region,
            // 可选：使用内网端点加速（如果服务器在阿里云内网）
            // endpoint: process.env.OSS_INTERNAL_ENDPOINT,
        });

        // 生成预签名上传 URL（有效期 1 小时）
        const uploadUrl = client.signatureUrl(objectKey, {
            method: 'PUT',
            expires: 3600, // 1 小时（秒）
            'Content-Type': contentType || 'image/jpeg',
        });

        // 生成公共访问 URL
        // 如果 publicUrl 是自定义域名，直接拼接；否则使用 OSS 标准格式
        let finalPublicUrl: string;
        if (publicUrl.includes('aliyuncs.com') || publicUrl.startsWith('http')) {
            // 如果已经是完整 URL，直接使用；否则使用 OSS 标准格式
            if (publicUrl.startsWith('http')) {
                finalPublicUrl = `${publicUrl.replace(/\/$/, '')}/${objectKey}`;
            } else {
                // 标准 OSS 域名格式
                finalPublicUrl = `https://${bucketName}.${region}.aliyuncs.com/${objectKey}`;
            }
        } else {
            // 自定义域名
            finalPublicUrl = `${publicUrl.replace(/\/$/, '')}/${objectKey}`;
        }

        return NextResponse.json(
            {
                success: true,
                uploadUrl,
                publicUrl: finalPublicUrl,
                objectKey,
            },
            { status: 200 }
        );

    } catch (error) {
        console.error('Avatar sign API error:', error);
        return NextResponse.json(
            { success: false, msg: '服务器内部错误' },
            { status: 500 }
        );
    }
}

