# Contributing

## Development Workflow
1. 安装依赖：`npm install`
2. 根据需要复制环境变量模板
3. 本地运行：`npm run dev`
4. 提交前至少执行：`npm run build`

## Workspace Layout
- `public-site/`：访客站
- `admin-site/`：开发者后台
- `shared/`：共享类型、组件与 Supabase 访问层
- `backend/`：本地旧后端与迁移脚本
- `supabase/`：Supabase SQL 与说明

## Before Opening a PR
- 确认没有提交真实 `.env` 文件
- 确认没有提交日志、调试缓存和本地媒体
- 确认 README 与部署说明仍然匹配当前架构
- 确认 `npm run build` 通过
