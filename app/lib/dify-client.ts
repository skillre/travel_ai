/**
 * Dify 工作流客户端
 * 
 * 用于调用 Dify LLM 工作流处理图片搜索和实体解析
 * 
 * 工作流职责:
 * 1. 检查 Notion 中是否有潜在重复项
 * 2. 使用 LLM 判断是否为同一地点
 * 3. 如果是重复项，更新别名并返回现有图片
 * 4. 如果是新地点，使用 Bing 搜索图片并创建新记录
 */

export interface DifyImageRequest {
    query_name: string;
    city: string;
    type?: 'spot' | 'food';
}

export interface DifyImageResponse {
    success: boolean;
    imageUrl?: string;
    source?: 'existing' | 'new';
    error?: string;
    // 额外的元数据
    standardizedName?: string;
    aliases?: string[];
}

/**
 * 调用 Dify 工作流获取图片
 * 
 * 这个函数会调用配置的 Dify 工作流 API，
 * 工作流负责处理实体解析、重复检测和图片搜索
 */
export async function callDifyImageWorkflow(
    request: DifyImageRequest
): Promise<DifyImageResponse> {
    const apiKey = process.env.DIFY_IMAGE_API_KEY;
    const apiUrl = process.env.DIFY_IMAGE_API_URL;

    if (!apiKey || !apiUrl) {
        console.warn('Dify API configuration missing');
        return {
            success: false,
            error: 'Dify API not configured'
        };
    }

    try {
        // 构建 Dify 工作流请求
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: {
                    query_name: request.query_name,
                    city: request.city,
                    type: request.type || 'spot'
                },
                response_mode: 'blocking',
                user: 'travel-ai-image-service'
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Dify API error:', response.status, errorText);
            return {
                success: false,
                error: `Dify API error: ${response.status}`
            };
        }

        const data = await response.json();
        
        // 解析 Dify 工作流返回的结果
        // Dify 工作流应该返回包含 image_url 的输出
        if (data.data?.outputs) {
            const outputs = data.data.outputs;
            
            return {
                success: true,
                imageUrl: outputs.image_url || outputs.imageUrl,
                source: outputs.source || 'new',
                standardizedName: outputs.standardized_name || outputs.standardizedName,
                aliases: outputs.aliases || []
            };
        }

        // 处理流式响应或其他格式
        if (data.answer || data.result) {
            // 尝试从文本响应中提取 URL
            const urlMatch = (data.answer || data.result).match(/https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|webp|gif)/i);
            if (urlMatch) {
                return {
                    success: true,
                    imageUrl: urlMatch[0],
                    source: 'new'
                };
            }
        }

        return {
            success: false,
            error: 'No image URL in Dify response'
        };

    } catch (error) {
        console.error('Dify workflow error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * 调用 Dify 工作流进行实体解析（不搜索图片）
 * 
 * 用于判断查询名称是否与已有记录是同一地点
 */
export async function callDifyEntityResolution(
    queryName: string,
    city: string,
    candidates: Array<{ name: string; aliases: string[] }>
): Promise<{
    isMatch: boolean;
    matchedName?: string;
    confidence?: number;
}> {
    const apiKey = process.env.DIFY_IMAGE_API_KEY;
    const apiUrl = process.env.DIFY_ENTITY_API_URL || process.env.DIFY_IMAGE_API_URL;

    if (!apiKey || !apiUrl) {
        return { isMatch: false };
    }

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: {
                    query_name: queryName,
                    city: city,
                    candidates: JSON.stringify(candidates),
                    mode: 'entity_resolution'
                },
                response_mode: 'blocking',
                user: 'travel-ai-entity-service'
            })
        });

        if (!response.ok) {
            return { isMatch: false };
        }

        const data = await response.json();
        
        if (data.data?.outputs) {
            const outputs = data.data.outputs;
            return {
                isMatch: outputs.is_match === true || outputs.is_match === 'true',
                matchedName: outputs.matched_name,
                confidence: outputs.confidence
            };
        }

        return { isMatch: false };

    } catch (error) {
        console.error('Dify entity resolution error:', error);
        return { isMatch: false };
    }
}

/**
 * 健康检查 - 验证 Dify API 配置是否正确
 */
export async function checkDifyHealth(): Promise<boolean> {
    const apiKey = process.env.DIFY_IMAGE_API_KEY;
    const apiUrl = process.env.DIFY_IMAGE_API_URL;

    if (!apiKey || !apiUrl) {
        return false;
    }

    try {
        // 发送一个简单的测试请求
        const response = await fetch(apiUrl.replace('/run', '/info'), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            }
        });

        return response.ok;
    } catch {
        return false;
    }
}

