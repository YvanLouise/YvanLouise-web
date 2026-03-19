# Security Policy

## Supported Deployment Model
当前默认上线方案是 `GitHub + Netlify + Supabase`。

## Reporting a Vulnerability
如果你发现安全问题，请不要通过公开 issue 直接披露细节。

建议通过以下方式联系维护者：
- GitHub 私信或仓库所有者可见的联系渠道
- 站点中公开提供的联系邮箱

## Basic Security Expectations
- 不要向仓库提交真实密钥、真实 `.env` 文件或生产访问令牌。
- 不要将后台私有数据导出到公开仓库，包括评论、私信和上传媒体。
- 在提交前至少运行一次 `npm run build`，确认当前改动没有破坏主站或后台。
- 生产环境的管理员账号应仅保留一个，并使用强密码和受控邮箱。
