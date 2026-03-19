# yvanlouise.xyz 上线指南（GitHub + Netlify + Supabase）

## 1. 目标拓扑
- `https://yvanlouise.xyz`：Dynadot 301 跳转到 `https://www.yvanlouise.xyz`
- `https://www.yvanlouise.xyz`：Netlify 上的访客站
- `https://admin.yvanlouise.xyz`：Netlify 上的开发者站
- 数据库、登录、评论、私信、媒体上传：Supabase

当前免费优先方案不启用：
- `api.yvanlouise.xyz`
- `media.yvanlouise.xyz`

## 2. GitHub 负责什么
GitHub 在当前方案中的角色是：
- 托管源码仓库
- 作为 Netlify 自动部署来源
- 运行构建检查工作流
- 管理协作、PR 与版本历史

GitHub 不承担生产运行时后端。

## 3. 先配置 Supabase
1. 在 Supabase 创建项目。
2. 打开 SQL Editor，执行 `supabase/schema.sql`。
3. 在 `Authentication -> Users` 中创建唯一管理员邮箱和密码。
4. 在 `Project Settings -> API` 记录：
   - `Project URL`
   - `anon public key`
   - `service_role key`
5. Storage 使用公共 bucket：`site-media`。

## 4. 迁移现有本地内容
迁移源：
- `backend/data/local-store.json`
- `backend/uploads`

迁移前准备环境变量，参考：
- `backend/.env.production.example`

至少需要：
```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_MEDIA_BUCKET=site-media
```

迁移命令：
```bash
npm run migrate:production
```

迁移脚本会：
- 校验被引用的本地图片和音频是否存在
- 上传媒体到 Supabase Storage 的 `site-media`
- 将旧的本地媒体 URL 改写为公开 Storage URL
- upsert 导入 `works / pages / site_settings / reviews / messages`
- 保留 `featuredWorkIds` 顺序

## 5. 配置 Netlify 访客站
1. 在 Netlify 新建站点并连接当前 GitHub 仓库。
2. Base directory 设为：`public-site`
3. Build command：`npm install && npm run build`
4. Publish directory：`dist`
5. 环境变量参考：`public-site/.env.production.example`

需要填写：
```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your anon key>
VITE_ADMIN_SITE_URL=https://admin.yvanlouise.xyz
VITE_BASE_PATH=/
```

仓库里已包含：`public-site/netlify.toml`

## 6. 配置 Netlify 开发者站
1. 再创建一个 Netlify 站点，连接同一个 GitHub 仓库。
2. Base directory 设为：`admin-site`
3. Build command：`npm install && npm run build`
4. Publish directory：`dist`
5. 环境变量参考：`admin-site/.env.production.example`

需要填写：
```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your anon key>
VITE_PUBLIC_SITE_URL=https://www.yvanlouise.xyz
VITE_BASE_PATH=/
```

仓库里已包含：`admin-site/netlify.toml`

## 7. 在 Dynadot 绑定域名
Dynadot 继续负责域名注册和 DNS。

建议配置：
1. 根域名 `@` 使用 `301 Forward` 指向 `https://www.yvanlouise.xyz`
2. `www` 使用 `CNAME` 指向 Netlify 为访客站提供的目标地址
3. `admin` 使用 `CNAME` 指向 Netlify 为开发者站提供的目标地址

注意：
- 不要手写猜测值，直接使用 Netlify 面板给出的目标地址
- 等 DNS 生效后再做最终联调

## 8. GitHub Actions 怎么用
当前仓库包含三类工作流：
- `ci.yml`：默认 CI，在 `push` 和 `pull_request` 时构建整个 monorepo
- `deploy-frontend.yml`：手动构建访客站产物
- `build-admin-site.yml`：手动构建开发者站产物

日常流程建议：
1. 本地开发和自测
2. `git push` 到 GitHub
3. GitHub Actions 自动运行构建检查
4. Netlify 从 GitHub 拉取最新代码并重新部署

## 9. 上线验收清单
### 访客站
- `https://www.yvanlouise.xyz` 能打开首页、关于、作品、委托、支持、联系
- 首页精选作品顺序与后台一致
- 作品详情页能正常显示封面、图集和音乐片段
- 旧 `/admin` 路径会跳转到 `https://admin.yvanlouise.xyz`

### 开发者站
- `https://admin.yvanlouise.xyz` 能正常登录
- 修改页面内容后，主站刷新可见
- 修改精选作品后，首页展示顺序同步变化
- 图片和音频上传正常

### 访客交互
- 私信可以提交
- 评论可以提交
- 评论仍然只在后台可见

## 10. 上线后的更新方式
### 改内容
- 登录 `https://admin.yvanlouise.xyz`
- 保存页面、作品、图片、音频等内容
- 数据会直接写入 Supabase
- 不需要重新部署

### 改代码
- 本地修改代码
- 提交并推送到 GitHub
- GitHub Actions 自动构建检查
- Netlify 自动重新部署 `public-site` 和 `admin-site`

## 11. 旧方案文件如何理解
仓库中仍然保留这些历史参考文件：
- `render.yaml`
- `public-site/vercel.json`
- `admin-site/vercel.json`
- 旧的 Render / Vercel / R2 相关代码和说明

它们不再是当前默认上线路径。当前请以 `GitHub + Netlify + Supabase` 为准。
