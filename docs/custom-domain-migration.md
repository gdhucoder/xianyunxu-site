# 自定义域名迁移计划

本轮不购买域名、不创建 `CNAME`、不修改 GitHub Pages 项目站点地址。

后续迁移步骤：

1. 选择专用域名，避免把临时测试域名作为正式品牌资产；
2. 在 GitHub 账户或组织中验证域名所有权；
3. 按 GitHub Pages 文档为精确主机名配置 DNS，不使用通配符 DNS；
4. 在仓库设置中配置 Custom domain；
5. 增加 `public/CNAME`，内容只能是确认后的单一域名；
6. 将 `astro.config.mjs` 的 `site` 改为完整自定义域名，并删除项目站点 `base`；
7. 检查 `src/lib/urls.ts`、robots、sitemap、canonical、Open Graph 和结构化数据；
8. 在 GitHub Pages 中启用 Enforce HTTPS，并等待证书生效；
9. 重新执行静态链接检查和全部页面线上验证；
10. 为旧 `github.io/xianyunxu-site/` 地址保留清楚、有限的跳转策略，避免形成循环或长期双 canonical。

DNS 生效后至少验证：首页、下载页、安装页、404、sitemap、favicon、OG 图片和 Release 外链。
