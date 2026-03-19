# YvanLouise Web

一个基于双站点结构的个人网站项目：
- `public-site/`：访客站
- `admin-site/`：开发者后台
- `shared/`：共享类型、组件与 Supabase 访问层
- `backend/`：本地旧后端与生产迁移脚本载体
- `supabase/`：Supabase 表结构、RLS 与存储说明

当前默认上线方案是：`GitHub + Netlify + Supabase`。

## 当前架构
- `https://www.yvanlouise.xyz`：访客站，部署到 Netlify 的 `public-site`
- `https://admin.yvanlouise.xyz`：开发者站，部署到 Netlify 的 `admin-site`
- `https://yvanlouise.xyz`：在 Dynadot 中做 301 跳转到 `https://www.yvanlouise.xyz`
- 登录、数据库、评论、私信、图片与音频上传：由 Supabase 提供

GitHub 在这套方案里的职责是：
- 托管源码仓库
- 管理提交历史、分支与 PR
- 运行 GitHub Actions 构建检查
- 作为 Netlify 自动部署的代码来源

## 仓库结构
- `public-site/`：访客站 Vite 应用
- `admin-site/`：开发者后台 Vite 应用
- `shared/`：共享类型、UI 片段、数据访问封装
- `backend/`：本地开发参考后端与 `migrate:production` 迁移脚本
- `supabase/`：Supabase SQL 与说明文档
- `.github/workflows/`：CI 与手动构建工作流

说明：旧的单前端 `frontend/` 已从主仓库结构中移除，不再是当前正式源码的一部分。

## 本地开发
### 1. 安装依赖
```bash
npm install
```

### 2. 准备环境变量
按需复制模板文件：
- `public-site/.env.example`
- `public-site/.env.production.example`
- `admin-site/.env.example`
- `admin-site/.env.production.example`
- `backend/.env.example`
- `backend/.env.production.example`

### 3. 常用命令
```bash
npm run dev              # 后端 + 访客站 + 开发者站
npm run dev:visitor      # 后端 + 访客站
npm run dev:developer    # 后端 + 开发者站
npm run build            # 构建整个 monorepo
npm run ci               # 与 GitHub Actions 一致的构建检查
npm run migrate:production
```

### 4. 一键更新 GitHub
- 双击运行：`update-github.bat`
- 脚本会自动：
  - 检查 Git、仓库和 `origin`
  - 显示当前改动
  - 执行 `git add -A`
  - 让你输入 commit message
  - 提交并推送到当前分支

## 上线方式
默认生产路线：`GitHub + Netlify + Supabase`
- `public-site` 连接 Netlify，绑定 `www.yvanlouise.xyz`
- `admin-site` 连接 Netlify，绑定 `admin.yvanlouise.xyz`
- `Supabase` 负责 Auth、Postgres 与 Storage
- `Dynadot` 负责域名解析和根域名跳转

详细步骤见：[DEPLOY.md](./DEPLOY.md)

## GitHub Actions
- `.github/workflows/ci.yml`
  - 在 `push` 和 `pull_request` 时运行
  - 安装依赖并构建整个 monorepo
- `.github/workflows/deploy-frontend.yml`
  - 手动构建访客站产物
- `.github/workflows/build-admin-site.yml`
  - 手动构建开发者站产物

说明：当前默认部署平台是 Netlify，这两个手动工作流用于构建产物检查，不直接承担正式上线。

## 仓库公开前约定
- 不提交真实 `.env` 文件，只提交 `*.example`
- 不提交真实上传媒体、日志、调试缓存和本地数据
- 评论与私信属于后台私有内容，不应导出到公开仓库
- 生产运行时默认以 `GitHub + Netlify + Supabase` 为准；旧的 Render / Vercel / R2 相关文件仅保留作历史参考

## 许可证
本仓库默认采用 MIT License，详见：[LICENSE](./LICENSE)
