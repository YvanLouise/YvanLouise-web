# YvanLouise Web

当前默认上线方案：
- `https://yvanlouise.xyz`：Dynadot 301 跳转到 `https://www.yvanlouise.xyz`
- `https://www.yvanlouise.xyz`：Netlify 部署 `public-site`
- `https://admin.yvanlouise.xyz`：Netlify 部署 `admin-site`
- 登录、数据库、评论、私信、媒体上传：Supabase

这套方案里，GitHub 的职责是：
- 托管代码仓库
- 管理提交历史、分支和 PR
- 运行 GitHub Actions 构建检查

GitHub 不承担运行时后端。生产环境的数据、登录和上传都由 Supabase 提供；真正的站点托管由 Netlify 负责。

## 仓库结构
- `public-site/`：访客站 Vite 应用
- `admin-site/`：开发者站 Vite 应用
- `shared/`：两套前端共用的类型、组件和 Supabase 适配层
- `backend/`：本地旧后端与迁移脚本载体，不再作为默认生产服务
- `supabase/schema.sql`：Supabase 表结构、RLS 与 Storage 策略
- `backend/scripts/migrate-production.ts`：本地数据和媒体迁移到 Supabase 的脚本

## 常用命令
- `npm install`
- `npm run dev`
- `npm run dev:visitor`
- `npm run dev:developer`
- `npm run build`
- `npm run ci`
- `npm run migrate:production`

## 环境变量模板
- `public-site/.env.example`
- `public-site/.env.production.example`
- `admin-site/.env.example`
- `admin-site/.env.production.example`
- `backend/.env.example`
- `backend/.env.production.example`

## GitHub 与自动化
- 默认自动检查：`.github/workflows/ci.yml`
  - 在 `push` 和 `pull_request` 时运行
  - 负责安装依赖并构建整个 monorepo
- 手动站点构建：
  - `.github/workflows/deploy-frontend.yml`
  - `.github/workflows/build-admin-site.yml`
  - 这两个现在只用于手动生成站点构建产物，不再表示“部署”

## 默认上线流程
1. 在 Supabase 创建项目并执行 `supabase/schema.sql`
2. 在 Supabase Auth 中手动创建唯一管理员邮箱和密码
3. 在 Netlify 分别创建 `public-site` 和 `admin-site` 两个站点
4. 在 Dynadot 配置：
   - 根域名 `@` -> 301 Forward 到 `https://www.yvanlouise.xyz`
   - `www` -> CNAME 到 Netlify 访客站
   - `admin` -> CNAME 到 Netlify 开发者站
5. 配好 Supabase 环境变量后运行 `npm run migrate:production`
6. 迁移完成后，通过 `admin.yvanlouise.xyz` 管理内容，通过 `www.yvanlouise.xyz` 对外展示

## 实时更新方式
- 改内容：进入 `admin.yvanlouise.xyz`，保存后直接写入 Supabase，访客刷新即可看到变化
- 改代码：推送到 GitHub，GitHub Actions 先做构建检查，Netlify 再自动拉取仓库并重新部署

## 旧文件说明
仓库里仍保留这些旧方案文件，作为历史参考：
- `render.yaml`
- `public-site/vercel.json`
- `admin-site/vercel.json`
- 旧的 Render / Vercel / R2 相关代码

它们不再是默认上线方案。当前请以 `GitHub + Netlify + Supabase` 为准。