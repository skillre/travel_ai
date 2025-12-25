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
        console.log('[Avatar Sign] 收到请求');
        
        // 调试：检查所有 OSS 相关的环境变量
        const allEnvKeys = Object.keys(process.env).filter(k => k.includes('OSS') || k.includes('oss'));
        console.log('[Avatar Sign] 所有包含 OSS 的环境变量键:', allEnvKeys);
        allEnvKeys.forEach(key => {
            const value = process.env[key];
            console.log(`[Avatar Sign] ${key}:`, value ? `${value.substring(0, 10)}... (length: ${value.length})` : 'undefined');
        });
        
        const body = await request.json();
        console.log('[Avatar Sign] 请求参数:', { userId: body.userId, fileName: body.fileName, contentType: body.contentType });
        const { userId, fileName, contentType } = body;

        if (!userId || typeof userId !== 'string') {
            console.error('[Avatar Sign] 缺少用户ID');
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
        let region = process.env.OSS_REGION;
        const publicUrl = process.env.OSS_PUBLIC_URL;
        
        // 调试：打印所有环境变量的实际值（隐藏敏感信息）
        console.log('[Avatar Sign] 环境变量读取结果:', {
            'OSS_ACCESS_KEY_ID': accessKeyId ? `${accessKeyId.substring(0, 4)}...(${accessKeyId.length})` : 'undefined/null/empty',
            'OSS_ACCESS_KEY_SECRET': accessKeySecret ? `***(${accessKeySecret.length})` : 'undefined/null/empty',
            'OSS_BUCKET_NAME': bucketName || 'undefined/null/empty',
            'OSS_REGION': region || 'undefined/null/empty',
            'OSS_PUBLIC_URL': publicUrl || 'undefined/null/empty',
        });
        
        // 修复 region 格式（如果包含 .aliyuncs.com，提取区域部分）
        if (region && region.includes('.aliyuncs.com')) {
            const originalRegion = region;
            region = region.split('.')[0];
            console.log('[Avatar Sign] 修复 OSS_REGION 格式:', { original: originalRegion, fixed: region });
        }

        // 检查缺失的环境变量
        const missingVars: string[] = [];
        if (!accessKeyId) missingVars.push('OSS_ACCESS_KEY_ID');
        if (!accessKeySecret) missingVars.push('OSS_ACCESS_KEY_SECRET');
        if (!bucketName) missingVars.push('OSS_BUCKET_NAME');
        if (!region) missingVars.push('OSS_REGION');
        if (!publicUrl) missingVars.push('OSS_PUBLIC_URL');

        if (missingVars.length > 0) {
            const errorDetails = {
                missing: missingVars,
                hasAccessKey: !!accessKeyId,
                hasSecretKey: !!accessKeySecret,
                hasBucket: !!bucketName,
                hasRegion: !!region,
                hasPublicUrl: !!publicUrl,
            };
            console.error('[Avatar Sign] OSS 配置缺失:', errorDetails);
            return NextResponse.json(
                { 
                    success: false, 
                    msg: `服务配置错误：缺少以下环境变量: ${missingVars.join(', ')}。请检查 Docker 环境变量配置。`,
                    details: errorDetails
                },
                { status: 500 }
            );
        }

        // 此时所有变量都已确认不为空，TypeScript 类型断言
        const finalAccessKeyId = accessKeyId!;
        const finalAccessKeySecret = accessKeySecret!;
        const finalBucketName = bucketName!;
        const finalRegion = region!;
        const finalPublicUrl = publicUrl!;

        console.log('[Avatar Sign] OSS 配置检查通过:', {
            bucket: finalBucketName,
            region: finalRegion,
            publicUrl: finalPublicUrl,
        });

        // 生成唯一的文件路径
        // 格式: avatars/{userId}/{timestamp}-{random}.jpg
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const fileExtension = fileName?.split('.').pop() || 'jpg';
        const objectKey = `avatars/${userId}/${timestamp}-${random}.${fileExtension}`;

        // 创建 OSS 客户端 - 强制使用 HTTPS
        console.log('[Avatar Sign] 创建 OSS 客户端...');
        const client = new OSS({
            accessKeyId: finalAccessKeyId,
            accessKeySecret: finalAccessKeySecret,
            bucket: finalBucketName,
            region: finalRegion,
            secure: true, // 强制使用 HTTPS
            // 可选：使用内网端点加速（如果服务器在阿里云内网）
            // endpoint: process.env.OSS_INTERNAL_ENDPOINT,
        });

        // 生成预签名上传 URL（有效期 1 小时）
        console.log('[Avatar Sign] 生成预签名 URL, objectKey:', objectKey);
        let uploadUrl = client.signatureUrl(objectKey, {
            method: 'PUT',
            expires: 3600, // 1 小时（秒）
            'Content-Type': contentType || 'image/jpeg',
        });
        
        // 确保 URL 使用 HTTPS（修复混合内容问题）
        if (uploadUrl.startsWith('http://')) {
            uploadUrl = uploadUrl.replace('http://', 'https://');
            console.log('[Avatar Sign] 已将预签名 URL 从 HTTP 转换为 HTTPS');
        }
        console.log('[Avatar Sign] 预签名 URL 生成成功:', uploadUrl.substring(0, 50) + '...');

        // 生成公共访问 URL
        // 确保使用 HTTPS（修复混合内容问题）
        let finalPublicUrlForResponse: string;
        if (finalPublicUrl.includes('aliyuncs.com') || finalPublicUrl.startsWith('http')) {
            // 如果已经是完整 URL，确保使用 HTTPS
            if (finalPublicUrl.startsWith('http://')) {
                finalPublicUrlForResponse = `${finalPublicUrl.replace('http://', 'https://').replace(/\/$/, '')}/${objectKey}`;
            } else if (finalPublicUrl.startsWith('https://')) {
                finalPublicUrlForResponse = `${finalPublicUrl.replace(/\/$/, '')}/${objectKey}`;
            } else {
                // 标准 OSS 域名格式（使用 HTTPS）
                finalPublicUrlForResponse = `https://${finalBucketName}.${finalRegion}.aliyuncs.com/${objectKey}`;
            }
        } else {
            // 自定义域名，如果没有协议，添加 https://
            const baseUrl = finalPublicUrl.startsWith('http') 
                ? finalPublicUrl.replace('http://', 'https://')
                : `https://${finalPublicUrl}`;
            finalPublicUrlForResponse = `${baseUrl.replace(/\/$/, '')}/${objectKey}`;
        }

        console.log('[Avatar Sign] 返回响应:', {
            success: true,
            objectKey,
            publicUrl: finalPublicUrlForResponse,
            uploadUrlLength: uploadUrl.length,
        });

        return NextResponse.json(
            {
                success: true,
                uploadUrl,
                publicUrl: finalPublicUrlForResponse,
                objectKey,
            },
            { status: 200 }
        );

    } catch (error) {
        console.error('[Avatar Sign] API 错误:', error);
        console.error('[Avatar Sign] 错误详情:', {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });
        return NextResponse.json(
            { 
                success: false, 
                msg: error instanceof Error ? `服务器错误: ${error.message}` : '服务器内部错误' 
            },
            { status: 500 }
        );
    }
}

