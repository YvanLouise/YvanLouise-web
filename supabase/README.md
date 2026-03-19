# Supabase Setup

## 需要完成的准备
1. 在 Supabase 新建项目。
2. 打开 SQL Editor，执行 `supabase/schema.sql`。
3. 在 `Authentication -> Users` 中手动创建唯一管理员账号。
4. 在 `Project Settings -> API` 中记录：
   - `Project URL`
   - `anon public key`
   - `service_role key`
5. Storage 使用公共 bucket：`site-media`。

## 前端部署时需要的变量
### public-site
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ADMIN_SITE_URL`
- `VITE_BASE_PATH=/`

### admin-site
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_PUBLIC_SITE_URL`
- `VITE_BASE_PATH=/`

## 迁移历史数据时需要的变量
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- 可选：`SUPABASE_MEDIA_BUCKET=site-media`

迁移命令：
```bash
npm run migrate:production
```

## 迁移脚本会做什么
- 读取 `backend/data/local-store.json`
- 扫描 `backend/uploads`
- 校验本地媒体文件是否齐全
- 上传图片和音频到 `site-media`
- 重写旧的本地媒体 URL
- upsert 导入作品、页面、站点设置、评论和私信

## 权限语义
- 访客可读取：`works`、`pages`、`site_settings`
- 访客可提交：`reviews`、`messages`
- 访客不可读取：评论列表、私信列表
- 管理员可管理全部后台内容
