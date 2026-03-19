# yvanlouise.xyz 上线指南（GitHub + Netlify + Supabase）

## 1. 目标拓扑
- `yvanlouise.xyz`：Dynadot 301 跳转到 `https://www.yvanlouise.xyz`
- `www.yvanlouise.xyz`：Netlify 访客站
- `admin.yvanlouise.xyz`：Netlify 开发者站
- 数据、登录、评论、私信、上传：Supabase

这条路线不会启用：
- `api.yvanlouise.xyz`
- `media.yvanlouise.xyz`

## 2. GitHub 负责什么
GitHub 在这套方案中的角色固定为：
- 托管代码仓库
- 管理分支、提交记录和 PR
- 运行 GitHub Actions 构建检查
- 作为 Netlify 的代码来源

也就是说：
- GitHub 不是生产后端
- GitHub Pages 不是当前方案
- Netlify 负责站点运行
- Supabase 负责动态能力

## 3. 先准备 Supabase
1. 在 Supabase 新建项目
2. 打开 SQL Editor，执行 `supabase/schema.sql`
3. 在 `Authentication -> Users` 中创建唯一管理员邮箱和密码
4. 在 `Project Settings -> API` 记录：
   - `Project URL`
   - `anon public key`
   - `service_role key`
5. Storage 会使用公共 bucket：`site-media`

## 4. 迁移当前本地内容
迁移来源：
- `backend/data/local-store.json`
- `backend/uploads`

先准备迁移环境变量，可参考：
- `backend/.env.production.example`

至少需要：
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- 可选：`SUPABASE_MEDIA_BUCKET=site-media`

然后运行：
- `npm run migrate:production`

迁移脚本会：
- 校验所有被引用的本地图片和音频都存在
- 把本地媒体上传到 Supabase Storage `site-media`
- 把旧的 `localhost/uploads/...` 地址改写成 Supabase 公共 URL
- upsert 导入 `works / pages / site_settings / reviews / messages`
- 保留 `featuredWorkIds` 顺序

## 5. 配置 Netlify 访客站
1. 在 Netlify 新建站点，连接当前 GitHub 仓库
2. Base directory 设为：`public-site`
3. Build command：`npm install && npm run build`
4. Publish directory：`dist`
5. 环境变量参考：`public-site/.env.production.example`

需要填写：
- `VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co`
- `VITE_SUPABASE_ANON_KEY=<your anon key>`
- `VITE_ADMIN_SITE_URL=https://admin.yvanlouise.xyz`
- `VITE_BASE_PATH=/`

仓库里已经包含：
- `public-site/netlify.toml`

## 6. 配置 Netlify 开发者站
1. 再创建一个 Netlify 站点，仍然连接同一个 GitHub 仓库
2. Base directory 设为：`admin-site`
3. Build command：`npm install && npm run build`
4. Publish directory：`dist`
5. 环境变量参考：`admin-site/.env.production.example`

需要填写：
- `VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co`
- `VITE_SUPABASE_ANON_KEY=<your anon key>`
- `VITE_PUBLIC_SITE_URL=https://www.yvanlouise.xyz`
- `VITE_BASE_PATH=/`

仓库里已经包含：
- `admin-site/netlify.toml`

## 7. 在 Dynadot 绑定域名
Dynadot 继续负责域名注册和 DNS。

在 Dynadot 后台配置：
1. 根域名 `@` 使用 `301 Forward` 指向：`https://www.yvanlouise.xyz`
2. `www` 子域名使用 `CNAME` 指向 Netlify 为访客站提供的目标地址
3. `admin` 子域名使用 `CNAME` 指向 Netlify 为开发者站提供的目标地址

注意：
- 不手写猜测值，直接照 Netlify 面板提供的目标填写
- 等 DNS 生效后再做最终联调

## 8. GitHub Actions 怎么用
当前仓库已经准备了三类工作流：
- `ci.yml`：默认 CI，负责在 `push` 和 `pull_request` 时构建整个仓库
- `deploy-frontend.yml`：手动构建访客站产物
- `build-admin-site.yml`：手动构建开发者站产物

建议日常以 `ci.yml` 为主：
- 你本地改代码
- push 到 GitHub
- GitHub Actions 自动做构建检查
- Netlify 自动从 GitHub 拉取并重新部署

## 9. 上线验收清单
### 访客站
- `https://www.yvanlouise.xyz` 能打开首页、关于、作品、委托、支持、联系
- 首页精选作品顺序与后台一致
- 作品详情页能正常显示封面、图集、音乐片段
- 旧 `/admin` 路径会跳到 `https://admin.yvanlouise.xyz`

### 开发者站
- `https://admin.yvanlouise.xyz` 能用管理员邮箱和密码登录
- 修改页面内容后，主站刷新可以看到变化
- 修改精选作品后，首页展示顺序同步变化
- 图片替换、图集上传、音乐片段上传正常

### 访客提交
- 私信可以提交
- 评论可以提交
- 评论仍然只在后台可见

## 10. 后续如何实时更新
### 改内容
- 打开 `https://admin.yvanlouise.xyz`
- 保存页面、作品、精选、图片、音频
- 数据会直接写入 Supabase
- 不需要重新部署

### 改代码
- 本地修改代码
- 提交并推送到 GitHub
- GitHub Actions 自动构建检查
- Netlify 自动重新部署 `public-site` 与 `admin-site`

## 11. 旧文件怎么理解
这些文件仍然存在，但已经不是默认上线路径：
- `render.yaml`
- `public-site/vercel.json`
- `admin-site/vercel.json`
- 旧的 R2 / Render 相关代码与说明

它们可以保留作历史参考，但当前请以 `GitHub + Netlify + Supabase` 为准。