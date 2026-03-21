# YvanLouise Web

Yvan Louise 的个人网站源码仓库。

这个仓库当前主要服务两个目标：
- 发布一个可公开访问的静态访客站
- 保留一套本地使用的内容编辑与实验工具，方便持续更新作品、页面文案和站点配置

## 当前推荐使用方式

### 公开访客站
- 目录：`public-site/`
- 类型：纯静态 Vite 站点
- 推荐部署：GitHub Pages
- 域名：`https://www.yvanlouise.xyz`

### 本地管理与内容维护
- 目录：`admin-site/`
- 用途：本地编辑内容、预览页面、整理作品信息
- 说明：当前不要求把管理站一起公开部署；如果你只是想维护公开网站，优先保证 `public-site` 的静态发布即可

## 仓库结构
- `public-site/`：公开访客站
- `admin-site/`：本地内容管理与实验性后台能力
- `shared/`：共享类型、样式、组件和数据访问封装
- `content/`：公开站内容文件，当前核心内容源是 `content/site-content.json`
- `backend/`：历史本地后端与迁移脚本载体，默认不参与当前公开站部署
- `supabase/`：旧方案参考文件，默认不作为当前上线主路径
- `.github/workflows/`：CI 与 GitHub Pages 自动部署工作流

## 本地开发

### 安装依赖
```bash
npm install
```

### 常用命令
```bash
npm run dev
npm run dev:visitor
npm run dev:developer
npm run build
npm run ci
```

### 环境变量模板
按需复制以下模板文件，再填写你自己的值：
- `public-site/.env.example`
- `public-site/.env.production.example`
- `admin-site/.env.example`
- `admin-site/.env.production.example`
- `admin-site/.env.netlify.functions.example`
- `backend/.env.example`

## 当前公开站部署方式

当前公开站已经按纯静态站思路整理，推荐部署到 GitHub Pages。

相关文件：
- GitHub Pages 工作流：`.github/workflows/deploy-frontend.yml`
- Pages 路由回退：`public-site/public/404.html`
- 部署说明：`GITHUB_PAGES_DEPLOY.md`

如果你只想让网站公开可访问，而不想继续维护线上动态后台，这就是最省事的路径。

## 内容更新方式

当前公开站使用仓库内的静态内容文件：
- `content/site-content.json`

也就是说，更新公开内容的最稳流程是：
1. 本地修改内容或页面代码
2. 提交到 GitHub
3. 由 GitHub Actions 自动重新部署公开站

## 项目状态说明

这个仓库保留了一些历史路线和实验性模块，例如：
- 早期的后端接口尝试
- 管理站的本地编辑逻辑
- 旧的第三方平台接入草案

它们会继续作为开发参考保留，但不代表当前公开站一定依赖这些模块上线。

## 开源说明

本仓库以 MIT License 公开。

这意味着你可以：
- 学习项目结构
- 参考实现方式
- 在遵守许可证的前提下复用代码

但请注意：
- 不要把仓库中出现的个人品牌、作品内容、图片、音频和身份信息默认视为可自由再分发素材
- 不要提交真实密钥、生产配置、私有消息或访客数据

## 相关文档
- 贡献说明：`CONTRIBUTING.md`
- 安全说明：`SECURITY.md`
- 许可证：`LICENSE`
- GitHub Pages 部署说明：`GITHUB_PAGES_DEPLOY.md`