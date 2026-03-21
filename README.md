# YvanLouise Web

一个双站点的个人网站仓库：
- `public-site/`：访客站，部署到 Netlify，面向公开访问
- `admin-site/`：开发者后台，部署到 Netlify，同时承载后台函数入口
- `shared/`：共享类型、组件、内容快照与数据访问封装
- `content/`：公开内容快照，作为访客站的静态内容源
- `backend/`：本地旧后端与辅助迁移脚本载体，不再是默认线上服务
- `supabase/`：旧方案历史参考，不是当前默认生产路径


## 当前生产分工
- `https://www.yvanlouise.xyz`：访客站，Netlify `public-site`
- `https://admin.yvanlouise.xyz`：开发者站，Netlify `admin-site`
- `https://yvanlouise.xyz`：Dynadot 301 跳转到 `https://www.yvanlouise.xyz`
- 公开内容：仓库内 `content/site-content.json`
- 管理后台接口：`admin-site/netlify/functions`
- 私信 / 评论：Netlify Blobs
- 图片 / 音频上传：Cloudinary

GitHub 在这套方案里的职责：
- 托管源码和公开内容文件
- 作为 Netlify 自动部署来源
- 承担内容发布的 commit 历史
- 运行 GitHub Actions 构建检查

## 仓库结构
- `public-site/`：访客站 Vite 应用
- `admin-site/`：开发者后台 Vite 应用 + Netlify Functions
- `shared/`：共享类型、UI 片段、内容快照和 API 封装
- `content/`：公开内容文件
- `backend/`：本地旧后端和历史迁移工具
- `.github/workflows/`：CI 与手动构建工作流

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
- `admin-site/.env.netlify.functions.example`
- `backend/.env.example`

## 内容发布方式
- 访客站构建时直接读取 `content/site-content.json`
- 开发者站保存页面、作品、站点设置时，会通过 Netlify Function 把内容写回 GitHub 仓库中的同一个内容文件
- GitHub 新 commit 会触发 Netlify 自动重新部署
- 访客站在重新部署后拿到最新静态内容

## 动态数据
- 私信与评论不会写入公开内容文件
- 它们由 `admin-site` 的 Netlify Functions 写入 Netlify Blobs
- 只有后台登录后才能读取这些记录

## 上传媒体
- 图片和音频不走仓库文件
- 管理站通过 Netlify Function 获取 Cloudinary 上传签名
- 浏览器直接上传到 Cloudinary
- 上传成功后，媒体 URL 会写回 `content/site-content.json`

## GitHub Actions
- `.github/workflows/ci.yml`
  - 在 `push` 和 `pull_request` 时运行
  - 安装依赖并构建整个 monorepo
- `.github/workflows/deploy-frontend.yml`
  - 手动构建访客站产物
- `.github/workflows/build-admin-site.yml`
  - 手动构建开发者站产物

## 一键更新 GitHub
- 双击运行：`update-github.bat`
- 脚本会自动：
  - 检查 Git、仓库和 `origin`
  - 显示当前改动
  - 执行 `git add -A`
  - 让你输入 commit message
  - 提交并推送到当前分支

## 安全与仓库约定
- 不提交真实 `.env` 文件，只提交模板
- 不提交真实上传媒体、日志、调试缓存和本地私有数据
- 评论与私信属于后台私有内容，不应导出到公开仓库
- `content/site-content.json` 只保存公开内容，不保存访客隐私数据

## 许可证
本仓库默认采用 MIT License，详见：[LICENSE](./LICENSE)
