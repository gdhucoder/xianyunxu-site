# 官网部署与维护

## 发布边界

官网只保存产品介绍、脱敏截图、下载元数据和公开文档。安装包、Updater 文件和模型继续由 `gdhucoder/xianyun-releases` Release Assets 承载。

任何提交前都要检查：

```bash
git status
git diff --check
pnpm install --frozen-lockfile
pnpm test
pnpm run check
pnpm run build
pnpm run check:site
```

## GitHub Pages

- 站点：`https://gdhucoder.github.io/xianyunxu-site/`；
- `astro.config.mjs` 的 `site` 是 GitHub Pages 用户根地址；
- `base` 是 `/xianyunxu-site`；
- 所有内部 URL 通过 `src/lib/urls.ts` 生成；
- 不建立 `gh-pages` 分支，不提交 `dist/`；
- `.github/workflows/deploy-pages.yml` 使用 `withastro/action` 上传构建结果，使用 `actions/deploy-pages` 部署。

如果首次部署未启用 Pages Source：

```text
Repository → Settings → Pages → Build and deployment → Source → GitHub Actions
```

## 更新发布版本

1. 在 `xianyun-releases` 创建并人工验证新的公开 Release；
2. 记录安装包 URL、文件名、字节大小和 SHA-256；
3. 使用 `pnpm update:downloads -- --platform=...` 或人工修改 manifest；
4. 运行 `pnpm validate:downloads`；
5. 更新 Markdown changelog；
6. 执行完整本地验证；
7. 提交并推送 `main`；
8. 等待 CI 与 Pages 工作流通过；
9. 使用无登录浏览器验证下载 URL 和主要页面。

不要从浏览器运行时调用 GitHub API，也不要把 `latest.json` 当作官网内容源。Tauri Updater 与官网 manifest 的生命周期和 Schema 完全独立。

## 更新截图

使用干净测试配置重新截图。至少由另一位人工检查者确认没有正文、凭据、姓名、单位、私有路径和仓库信息后，再复制到 `public/assets/screenshots/`。

## 依赖更新

只使用 Astro 官方文档支持的 Node 版本；升级 Astro 与官方 integration 后重新运行全部检查。Actions 使用官方主版本标签，升级时核对 Astro 和 GitHub 官方仓库的当前示例。
