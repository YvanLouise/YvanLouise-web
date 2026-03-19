# Supabase Setup

1. 在 Supabase 新建一个项目。
2. 打开 SQL Editor，执行 `supabase/schema.sql`。
3. 在 `Authentication -> Users` 里手动创建唯一的管理员邮箱和密码。
4. 在 `Project Settings -> API` 里记下：
   - `Project URL`
   - `anon public key`
   - `service_role key`
5. 前端部署时使用 `Project URL + anon key`。
6. 迁移历史数据时使用 `Project URL + service_role key` 运行 `npm run migrate:production`。
7. Storage 会使用 `site-media` 公共 bucket，图片和音频都从这里读取。