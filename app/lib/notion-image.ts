/**
 * Notion 图片数据库服务
 * 
 * 用于查询和管理 Trip Gallery 数据库中的图片缓存
 * 
 * 数据库架构:
 * - Name (标题): 标准化的地点名称（主键）
 * - City (选择): 用于区分同名地点
 * - Aliases (文本): 逗号分隔的别名，用于模糊匹配
 * - Image URL (URL): 经过验证的图片链接
 * - Status (选择): Auto | Verified | Fixed
 */

import { Client } from '@notionhq/client';

// Notion 客户端单例
let notionClient: Client | null = null;

function getNotionClient(): Client {
    if (!notionClient) {
        const apiKey = process.env.NOTION_API_KEY;
        if (!apiKey) {
            throw new Error('NOTION_API_KEY is not configured');
        }
        notionClient = new Client({ auth: apiKey });
    }
    return notionClient;
}

export interface NotionImageRecord {
    id: string;
    name: string;
    city: string;
    aliases: string[];
    imageUrl: string;
    status: 'Auto' | 'Verified' | 'Fixed';
}

export interface NotionQueryResult {
    found: boolean;
    record?: NotionImageRecord;
}

/**
 * 从 Notion 数据库查询图片
 * 
 * 查询策略:
 * 1. 精确匹配 Name 字段
 * 2. 如果没有精确匹配，搜索 Aliases 字段（模糊匹配）
 * 3. 可选：按 City 过滤
 */
export async function queryNotionImage(
    name: string,
    city?: string
): Promise<NotionQueryResult> {
    const databaseId = process.env.NOTION_IMAGE_DATABASE_ID;
    
    if (!databaseId) {
        console.warn('NOTION_IMAGE_DATABASE_ID is not configured');
        return { found: false };
    }

    try {
        const notion = getNotionClient();
        
        // 构建查询过滤器 - 先尝试精确匹配 Name
        const nameFilter: any = {
            property: 'Name',
            title: {
                equals: name
            }
        };

        // 如果提供了城市，添加城市过滤
        const filters: any[] = [nameFilter];
        if (city) {
            filters.push({
                property: 'City',
                select: {
                    equals: city
                }
            });
        }

        // 第一次查询：精确匹配 Name
        let response = await notion.databases.query({
            database_id: databaseId,
            filter: filters.length > 1 ? { and: filters } : nameFilter,
            page_size: 1
        });

        // 如果精确匹配找到了
        if (response.results.length > 0) {
            const record = parseNotionRecord(response.results[0]);
            if (record && record.imageUrl) {
                return { found: true, record };
            }
        }

        // 第二次查询：搜索 Aliases 字段（模糊匹配）
        const aliasFilter: any = {
            property: 'Aliases',
            rich_text: {
                contains: name
            }
        };

        const aliasFilters: any[] = [aliasFilter];
        if (city) {
            aliasFilters.push({
                property: 'City',
                select: {
                    equals: city
                }
            });
        }

        response = await notion.databases.query({
            database_id: databaseId,
            filter: aliasFilters.length > 1 ? { and: aliasFilters } : aliasFilter,
            page_size: 1
        });

        if (response.results.length > 0) {
            const record = parseNotionRecord(response.results[0]);
            if (record && record.imageUrl) {
                return { found: true, record };
            }
        }

        return { found: false };

    } catch (error) {
        console.error('Notion query error:', error);
        return { found: false };
    }
}

/**
 * 在 Notion 数据库中创建新的图片记录
 */
export async function createNotionImageRecord(
    name: string,
    city: string,
    imageUrl: string,
    aliases: string[] = [],
    status: 'Auto' | 'Verified' | 'Fixed' = 'Auto'
): Promise<NotionImageRecord | null> {
    const databaseId = process.env.NOTION_IMAGE_DATABASE_ID;
    
    if (!databaseId) {
        console.warn('NOTION_IMAGE_DATABASE_ID is not configured');
        return null;
    }

    try {
        const notion = getNotionClient();
        
        const response = await notion.pages.create({
            parent: { database_id: databaseId },
            properties: {
                Name: {
                    title: [
                        {
                            text: {
                                content: name
                            }
                        }
                    ]
                },
                City: {
                    select: {
                        name: city
                    }
                },
                Aliases: {
                    rich_text: [
                        {
                            text: {
                                content: aliases.join(', ')
                            }
                        }
                    ]
                },
                'Image URL': {
                    url: imageUrl
                },
                Status: {
                    select: {
                        name: status
                    }
                }
            }
        });

        return parseNotionRecord(response);

    } catch (error) {
        console.error('Notion create error:', error);
        return null;
    }
}

/**
 * 更新 Notion 记录的 Aliases 字段
 */
export async function updateNotionAliases(
    pageId: string,
    newAlias: string,
    existingAliases: string[]
): Promise<boolean> {
    try {
        const notion = getNotionClient();
        
        // 添加新别名（如果不存在）
        const aliasSet = new Set([...existingAliases, newAlias]);
        const updatedAliases = Array.from(aliasSet);
        
        await notion.pages.update({
            page_id: pageId,
            properties: {
                Aliases: {
                    rich_text: [
                        {
                            text: {
                                content: updatedAliases.join(', ')
                            }
                        }
                    ]
                }
            }
        });

        return true;

    } catch (error) {
        console.error('Notion update error:', error);
        return false;
    }
}

/**
 * 解析 Notion API 返回的记录
 */
function parseNotionRecord(page: any): NotionImageRecord | null {
    try {
        const properties = page.properties;
        
        // 获取 Name
        const nameProperty = properties.Name;
        const name = nameProperty?.title?.[0]?.text?.content || '';
        
        // 获取 City
        const cityProperty = properties.City;
        const city = cityProperty?.select?.name || '';
        
        // 获取 Aliases
        const aliasesProperty = properties.Aliases;
        const aliasesText = aliasesProperty?.rich_text?.[0]?.text?.content || '';
        const aliases = aliasesText ? aliasesText.split(',').map((a: string) => a.trim()).filter(Boolean) : [];
        
        // 获取 Image URL
        const imageUrlProperty = properties['Image URL'];
        const imageUrl = imageUrlProperty?.url || '';
        
        // 获取 Status
        const statusProperty = properties.Status;
        const status = statusProperty?.select?.name || 'Auto';

        return {
            id: page.id,
            name,
            city,
            aliases,
            imageUrl,
            status: status as 'Auto' | 'Verified' | 'Fixed'
        };

    } catch (error) {
        console.error('Parse Notion record error:', error);
        return null;
    }
}

/**
 * 搜索 Notion 数据库中可能的重复项（用于 Dify 工作流）
 */
export async function searchPotentialDuplicates(
    queryName: string,
    city?: string
): Promise<NotionImageRecord[]> {
    const databaseId = process.env.NOTION_IMAGE_DATABASE_ID;
    
    if (!databaseId) {
        return [];
    }

    try {
        const notion = getNotionClient();
        
        // 构建模糊搜索过滤器
        const filters: any[] = [
            {
                or: [
                    {
                        property: 'Name',
                        title: {
                            contains: queryName
                        }
                    },
                    {
                        property: 'Aliases',
                        rich_text: {
                            contains: queryName
                        }
                    }
                ]
            }
        ];

        if (city) {
            filters.push({
                property: 'City',
                select: {
                    equals: city
                }
            });
        }

        const response = await notion.databases.query({
            database_id: databaseId,
            filter: filters.length > 1 ? { and: filters } : filters[0],
            page_size: 5
        });

        return response.results
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((page: any) => parseNotionRecord(page))
            .filter((r: NotionImageRecord | null): r is NotionImageRecord => r !== null);

    } catch (error) {
        console.error('Notion search error:', error);
        return [];
    }
}

