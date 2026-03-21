# GitHub Pages 部署说明

## 适用范围
- 这个说明只负责访客站 `public-site`
- 管理站不再要求一起上线
- 当前访客站已经按纯静态站处理，不再依赖评论、私信或管理站函数

## 仓库内已准备好的内容
- GitHub Pages 自动部署工作流：`.github/workflows/deploy-frontend.yml`
- GitHub Pages 路由刷新回退：`public-site/public/404.html`
- 公开站生产环境模板：`public-site/.env.production.example`

## 第一步：把最新代码推到 GitHub
```powershell
cd "D:\MY procedure\YvanLouise web"
git add public-site/index.html public-site/public/404.html public-site/.env.production.example .github/workflows/ci.yml .github/workflows/deploy-frontend.yml GITHUB_PAGES_DEPLOY.md
git commit -m "Add GitHub Pages deployment for public site"
git push origin main
```

## 第二步：开启 GitHub Pages
1. 打开仓库 `YvanLouise/YvanLouise-web`
2. 进入 `Settings`
3. 打开 `Pages`
4. 在 `Build and deployment` 里把 `Source` 设成 `GitHub Actions`

之后 GitHub 会使用仓库里的工作流自动部署 `public-site`

## 第三步：等待 Actions 部署完成
部署工作流名称：`Deploy Public Site to GitHub Pages`

成功后，你会得到一个默认的 GitHub Pages 地址，通常类似：
- `https://yvanlouise.github.io/YvanLouise-web/`

如果你的仓库 Pages 已正确启用，也可能直接显示在 Pages 面板里。

## 第四步：绑定 `www.yvanlouise.xyz`
根据 GitHub 官方文档，自定义子域名应使用 `CNAME` 指向你的 GitHub Pages 默认域名，而不是仓库路径。

在 Dynadot 里这样配：
- `www` -> `CNAME` -> `YvanLouise.github.io`
- 根域名 `@` -> 继续用 `301 Forward` 跳转到 `https://www.yvanlouise.xyz`

## 第五步：在 GitHub 仓库里填写自定义域名
1. 打开仓库 `Settings`
2. 进入 `Pages`
3. 在 `Custom domain` 里填入：
```text
www.yvanlouise.xyz
```
4. 保存
5. 等待 HTTPS 生效

## 第六步：访客站环境变量
GitHub Actions 工作流已经默认写入：
```env
VITE_SITE_RUNTIME=public
VITE_ADMIN_SITE_URL=https://yl-a-side.netlify.app
VITE_BASE_PATH=/
```

如果你之后换了管理站地址，只需要改仓库 Secret：
- `PUBLIC_SITE_ADMIN_URL`

## 第七步：以后如何更新网站
以后更新访客站内容的流程是：
1. 本地修改内容文件或前端代码
2. `git push origin main`
3. GitHub Actions 自动重新部署 GitHub Pages
4. 访客站更新完成

## 说明
- 访客站现在是纯静态站
- 站内私信和评论入口已经隐藏
- GitHub Pages 只负责公开站
- 如果以后你要恢复后台更新内容，再单独决定管理站部署方式

## 参考文档
- GitHub Pages 自定义工作流：[Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- GitHub Pages 自定义域名：[Managing a custom domain for your GitHub Pages site](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)