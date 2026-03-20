# yvanlouise.xyz 上线指南（GitHub + Netlify + GitHub 内容文件 + Cloudinary）

## 1. 目标拓扑
- `https://yvanlouise.xyz`：Dynadot 301 跳转到 `https://www.yvanlouise.xyz`
- `https://www.yvanlouise.xyz`：Netlify 上的访客站
- `https://admin.yvanlouise.xyz`：Netlify 上的开发者站
- 公开内容：GitHub 仓库内 `content/site-content.json`
- 后台接口：`admin-site/netlify/functions`
- 评论与私信：Netlify Blobs
- 图片与音频：Cloudinary

## 2. GitHub 负责什么
GitHub 在当前方案中的角色：
- 托管源码仓库
- 托管公开内容文件 `content/site-content.json`
- 作为 Netlify 自动部署来源
- 保存后台每次内容发布的 commit 历史
- 运行 GitHub Actions 构建检查

GitHub 不承担运行时 API，但会承载公开内容的事实源。

## 3. 准备 GitHub 内容写回
在 GitHub 创建一个具备 repo 写权限的 Personal Access Token，并在 Netlify 的 `admin-site` 中配置：
- `GITHUB_TOKEN`
- `GITHUB_OWNER=YvanLouise`
- `GITHUB_REPO=YvanLouise-web`
- `GITHUB_BRANCH=main`
- `CONTENT_FILE_PATH=content/site-content.json`

后台保存公开内容时，会通过 GitHub Contents API 更新这个文件。

## 4. 准备 Cloudinary
1. 注册 Cloudinary 免费账户。
2. 记录以下信息：
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
3. 在 Netlify `admin-site` 环境变量中填写这三个值。

说明：
- 管理站不会把高权限密钥暴露给浏览器
- 浏览器会先向后台函数拿签名，再直传 Cloudinary

## 5. 配置 Netlify 访客站
1. 在 Netlify 新建站点并连接当前 GitHub 仓库。
2. Base directory：`public-site`
3. Build command：`npm install && npm run build`
4. Publish directory：`dist`
5. 环境变量参考：`public-site/.env.production.example`

需要填写：
```env
VITE_ADMIN_SITE_URL=https://admin.yvanlouise.xyz
VITE_PUBLIC_INTERACTION_BASE=https://admin.yvanlouise.xyz/.netlify/functions
VITE_BASE_PATH=/
```

## 6. 配置 Netlify 开发者站
1. 再创建一个 Netlify 站点，连接同一个 GitHub 仓库。
2. Base directory：`admin-site`
3. Build command：`npm install && npm run build`
4. Publish directory：`dist`
5. 环境变量参考：
   - `admin-site/.env.production.example`
   - `admin-site/.env.netlify.functions.example`

前端环境变量：
```env
VITE_PUBLIC_SITE_URL=https://www.yvanlouise.xyz
VITE_BASE_PATH=/
```

函数环境变量至少需要：
```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<bcrypt hash>
ADMIN_SESSION_SECRET=<long random string>
PUBLIC_SITE_ORIGIN=https://www.yvanlouise.xyz
GITHUB_TOKEN=<github PAT>
GITHUB_OWNER=YvanLouise
GITHUB_REPO=YvanLouise-web
GITHUB_BRANCH=main
CONTENT_FILE_PATH=content/site-content.json
CLOUDINARY_CLOUD_NAME=<cloudinary cloud>
CLOUDINARY_API_KEY=<cloudinary key>
CLOUDINARY_API_SECRET=<cloudinary secret>
```

## 7. 生成管理员密码哈希
先安装依赖，然后运行：
```bash
node admin-site/scripts/hash-admin-password.mjs 你的后台密码
```

把输出结果填到 `ADMIN_PASSWORD_HASH`。

## 8. 在 Dynadot 绑定域名
Dynadot 继续负责域名注册和 DNS。

建议配置：
1. 根域名 `@` 使用 `301 Forward` 指向 `https://www.yvanlouise.xyz`
2. `www` 使用 `CNAME` 指向 Netlify 为访客站提供的目标地址
3. `admin` 使用 `CNAME` 指向 Netlify 为开发者站提供的目标地址

注意：
- 不要手写猜测值，直接使用 Netlify 面板给出的目标地址
- 等 DNS 生效后再做最终联调

## 9. 内容与交互如何工作
### 公开内容
- 访客站构建时读取 `content/site-content.json`
- 后台保存公开内容时，管理站函数更新该文件并提交到 GitHub
- GitHub 新 commit 触发 Netlify 自动重新部署
- 访客站刷新后即可看到最新部署内容

### 私信与评论
- 访客站会把私信和评论 POST 到 `admin.yvanlouise.xyz/.netlify/functions/...`
- 后台函数把它们存进 Netlify Blobs
- 只有管理员登录后可以读取

### 图片与音频
- 管理站通过签名上传到 Cloudinary
- 返回的媒体 URL 会写回公开内容文件
- 访客站下一次部署后会使用新的资源地址

## 10. GitHub Actions 怎么用
当前仓库包含三类工作流：
- `ci.yml`：默认 CI，在 `push` 和 `pull_request` 时构建整个 monorepo
- `deploy-frontend.yml`：手动构建访客站产物
- `build-admin-site.yml`：手动构建开发者站产物

推荐流程：
1. 本地修改代码并测试
2. `git push` 到 GitHub
3. GitHub Actions 自动跑构建检查
4. Netlify 自动拉取并重新部署两个站点

## 11. 上线验收清单
### 访客站
- `https://www.yvanlouise.xyz` 能打开首页、关于、作品、委托、支持、联系
- 首页精选作品顺序与后台一致
- 作品详情页能正常显示封面、图集和音乐片段
- 旧 `/admin` 路径会跳转到 `https://admin.yvanlouise.xyz`

### 开发者站
- `https://admin.yvanlouise.xyz` 能用用户名/密码登录
- 修改页面内容后，GitHub 仓库中 `content/site-content.json` 产生新 commit
- Netlify 自动重新部署后，主站能看到最新内容
- 图片和音频上传正常

### 访客交互
- 私信可以提交
- 评论可以提交
- 评论仍然只在后台可见

## 12. 旧方案如何理解
仓库中仍保留这些历史参考：
- `backend/`
- `supabase/`
- 早期 Render / Vercel / R2 相关文件

它们不再是当前默认生产路径。现在请以 `GitHub + Netlify + GitHub 内容文件 + Netlify Functions/Blobs + Cloudinary` 为准。
