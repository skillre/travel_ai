# AI 旅行规划师

基于 Next.js 14 构建的智能旅行规划系统，集成 Dify AI 工作流和高德地图。

## ✨ 功能特性

- 🤖 AI 智能行程生成 - 基于 Dify 工作流
- 🗺️ 高德地图可视化 - 展示景点标记和路线
- 📋 详细行程列表 - 按天分组的景点信息
- 🎨 现代化 UI 设计 - 暗色主题，流畅动画

## 🚀 Vercel 部署指南

### 1. 准备工作

确保您已有以下账号和配置：
- GitHub 账号
- [Vercel](https://vercel.com) 账号
- [高德地图](https://lbs.amap.com) Web JS API Key
- Dify 工作流 API 配置

### 2. 推送代码到 GitHub

```bash
git init
git add .
git commit -m "Initial commit: AI Travel Planner"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/travel-ai.git
git push -u origin main
```

### 3. 在 Vercel 导入项目

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 "Add New..." → "Project"
3. 选择您的 GitHub 仓库
4. 点击 "Import"

### 4. 配置环境变量

在 Vercel 项目设置中添加以下环境变量：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `DIFY_API_URL` | Dify 工作流 API 地址 | `https://your-domain.com/v1/workflows/run` |
| `DIFY_API_KEY` | Dify API 密钥 | `app-xxxxxxxxxxxx` |
| `NEXT_PUBLIC_AMAP_KEY` | 高德地图 Web JS API Key | `your-amap-key` |

### 5. 部署

点击 "Deploy" 按钮，等待部署完成。

## 🔒 安全说明

- `DIFY_API_URL` 和 `DIFY_API_KEY` 仅在服务端使用，不会暴露给客户端
- `NEXT_PUBLIC_AMAP_KEY` 会暴露在客户端，建议在高德控制台设置域名白名单

## 📁 项目结构

```
travel_ai/
├── app/
│   ├── api/
│   │   └── generate-plan/
│   │       └── route.ts      # API 路由
│   ├── components/
│   │   └── MapContainer.tsx  # 地图组件
│   ├── globals.css           # 全局样式
│   ├── layout.tsx            # 根布局
│   └── page.tsx              # 主页面
├── .env.example              # 环境变量示例
├── next.config.js            # Next.js 配置
├── package.json              # 依赖配置
├── tailwind.config.js        # Tailwind 配置
└── README.md                 # 本文档
```

## 🛠️ 本地开发（可选）

如需本地开发，执行以下命令：

```bash
npm install
cp .env.example .env.local
# 编辑 .env.local 填入实际配置
npm run dev
```

## 📝 License

MIT
