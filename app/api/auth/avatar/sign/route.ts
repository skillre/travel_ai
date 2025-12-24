import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// 强制动态渲染
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/avatar/sign
 * 获取 Cloudflare R2 上传凭证接口
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
        const accessKeyId = process.env.R2_ACCESS_KEY_ID;
        const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
        const bucketName = process.env.R2_BUCKET_NAME;
        const publicUrl = process.env.R2_PUBLIC_URL;
        const endpoint = process.env.R2_ENDPOINT;
        const region = process.env.R2_REGION || 'auto';

        if (!accessKeyId || !secretAccessKey || !bucketName || !publicUrl || !endpoint) {
            console.error('Missing R2 configuration:', {
                hasAccessKey: !!accessKeyId,
                hasSecretKey: !!secretAccessKey,
                hasBucket: !!bucketName,
                hasPublicUrl: !!publicUrl,
                hasEndpoint: !!endpoint,
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

        // 创建 S3 客户端（R2 兼容 S3 API）
        const s3Client = new S3Client({
            region: region,
            endpoint: endpoint,
            credentials: {
                accessKeyId: accessKeyId,
                secretAccessKey: secretAccessKey,
            },
            forcePathStyle: true, // R2 需要使用路径样式
        });

        // 创建 PutObject 命令
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: objectKey,
            ContentType: contentType || 'image/jpeg',
            // 可选：设置缓存控制
            CacheControl: 'public, max-age=31536000, immutable',
        });

        // 生成预签名 URL（有效期 1 小时）
        const uploadUrl = await getSignedUrl(s3Client, command, {
            expiresIn: 3600, // 1 小时
        });

        // 生成公共访问 URL
        const finalPublicUrl = `${publicUrl}/${objectKey}`;

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

