import { NextRequest, NextResponse } from 'next/server';

// 强制动态渲染
export const dynamic = 'force-dynamic';

interface NotionPage {
    id: string;
    properties: {
        Title?: {
            title: Array<{ plain_text: string }>;
        };
        PlanJSON?: {
            rich_text: Array<{ plain_text: string }>;
        };
        [key: string]: any;
    };
}

/**
 * 将 Python 风格的字符串（单引号）转换为标准 JSON（双引号）
 * 使用状态机逻辑智能处理字符串内容中的特殊字符
 */
function pythonToJson(pythonStr: string): string {
    // 处理 Python 的 True/False/None（先处理，避免被引号替换影响）
    let result = pythonStr
        .replace(/\bTrue\b/g, 'true')
        .replace(/\bFalse\b/g, 'false')
        .replace(/\bNone\b/g, 'null');

    // 使用状态机将单引号字符串转换为双引号
    let output = '';
    let inString = false;
    let i = 0;

    while (i < result.length) {
        const char = result[i];
        const nextChar = result[i + 1];

        if (!inString) {
            // 不在字符串内
            if (char === "'") {
                // 开始一个新字符串
                output += '"';
                inString = true;
            } else {
                output += char;
            }
        } else {
            // 在字符串内
            if (char === '\\' && nextChar === "'") {
                // 转义的单引号 \' -> \"
                output += '\\"';
                i++; // 跳过下一个字符
            } else if (char === '"') {
                // 字符串内的双引号需要转义
                output += '\\"';
            } else if (char === "'") {
                // 结束字符串
                output += '"';
                inString = false;
            } else if (char === '\n') {
                // 换行符需要转义
                output += '\\n';
            } else if (char === '\r') {
                // 回车符需要转义
                output += '\\r';
            } else if (char === '\t') {
                // 制表符需要转义
                output += '\\t';
            } else {
                output += char;
            }
        }
        i++;
    }

    return output;
}

/**
 * 尝试多种方式解析可能是 Python 格式的 JSON 字符串
 */
function parseFlexibleJson(str: string): any {
    // 清理字符串
    let cleanStr = str.trim();

    // 1. 首先尝试直接解析（标准 JSON）
    try {
        return JSON.parse(cleanStr);
    } catch {
        // 继续尝试其他方法
    }

    // 2. 尝试 Python 格式转换
    try {
        const jsonStr = pythonToJson(cleanStr);
        return JSON.parse(jsonStr);
    } catch {
        // 继续尝试其他方法
    }

    // 3. 尝试使用 Function 构造器（更宽松的解析）
    // 这可以处理一些边缘情况，如尾随逗号
    try {
        // 移除可能的尾随逗号（JSON 不允许）
        const noTrailingComma = cleanStr.replace(/,\s*([\]}])/g, '$1');
        const jsonStr = pythonToJson(noTrailingComma);
        return JSON.parse(jsonStr);
    } catch {
        // 继续尝试其他方法
    }

    // 4. 最后尝试使用 eval（仅限于看起来像对象的字符串）
    // 注意：这在服务端是相对安全的，因为数据来自我们自己的 Notion
    try {
        if (cleanStr.startsWith('{') || cleanStr.startsWith('[')) {
            // 使用 Function 而非 eval，稍微安全一些
            const parsed = new Function('return ' + cleanStr)();
            // 转换为 JSON 再解析回来，确保是纯 JSON 对象
            return JSON.parse(JSON.stringify(parsed));
        }
    } catch {
        // 所有方法都失败了
    }

    throw new Error('无法解析 JSON 字符串');
}


export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const pageId = params.id;

        if (!pageId) {
            return NextResponse.json(
                { error: '缺少页面 ID' },
                { status: 400 }
            );
        }

        const notionKey = process.env.NOTION_API_KEY;

        if (!notionKey) {
            console.error('Missing NOTION_API_KEY');
            return NextResponse.json(
                { error: 'Notion 配置错误' },
                { status: 500 }
            );
        }

        // 获取 Notion 页面
        const response = await fetch(
            `https://api.notion.com/v1/pages/${pageId}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${notionKey}`,
                    'Notion-Version': '2022-06-28',
                },
                cache: 'no-store', // 禁用 Next.js 服务端缓存
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Notion API error:', response.status, errorText);
            return NextResponse.json(
                { error: '获取记录详情失败' },
                { status: response.status }
            );
        }

        const page: NotionPage = await response.json();

        // 解析 PlanJSON 字段
        const planJsonProp = page.properties.PlanJSON;
        if (!planJsonProp?.rich_text?.[0]?.plain_text) {
            return NextResponse.json(
                { error: '该记录没有行程数据' },
                { status: 404 }
            );
        }

        // 获取完整的 PlanJSON 字符串（可能分布在多个 rich_text 块中）
        let planJsonStr = '';
        for (const textBlock of planJsonProp.rich_text) {
            if (textBlock.plain_text) {
                planJsonStr += textBlock.plain_text;
            }
        }

        // 解析 JSON 字符串（支持标准 JSON 和 Python 格式）
        let planData;
        try {
            planData = parseFlexibleJson(planJsonStr);
        } catch (parseError) {
            console.error('Failed to parse PlanJSON:', planJsonStr.substring(0, 500));
            console.error('Parse error:', parseError);
            return NextResponse.json(
                { error: '行程数据格式错误，无法解析' },
                { status: 500 }
            );
        }

        // 获取标题
        let title = '';
        const titleProp = page.properties.Title || page.properties.Name;
        if (titleProp?.title?.[0]?.plain_text) {
            title = titleProp.title[0].plain_text;
        }

        return NextResponse.json({
            success: true,
            data: planData,
            title: title,
        }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
            },
        });

    } catch (error) {
        console.error('History detail API error:', error);
        return NextResponse.json(
            { error: '服务器内部错误' },
            { status: 500 }
        );
    }
}
