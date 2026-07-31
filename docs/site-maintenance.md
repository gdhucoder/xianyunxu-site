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

1. 在 `xianyun-releases` 创建并人工验证新的正式 Release；
2. Release 标签使用 `v<semver>`，同时上传唯一的 macOS ARM64 DMG 和 Windows x64 Setup EXE；
3. 两个安装包必须带有 GitHub Release Asset 的 SHA-256 digest；
4. Release Notes 必须包含 `## 本次更新`，该小节只写面向用户的功能条目；
5. 安装限制、安全提示和排障内容继续放在官网常见问题，不写入“本次更新”；
6. 应用发布流程会立即向 `.github/workflows/sync-latest-release.yml` 发送事件；
   每 6 小时读取公开 Latest Release 的定时任务继续作为兜底；
7. 流程自动更新 `download-manifest.json` 和 `current.md`，验证网站后提交 `main`；
8. 同步任务提交后会显式触发 GitHub Pages 重新部署，避免机器人提交不能连锁触发
   工作流的问题。

同步过程只在 GitHub Actions 构建时调用公开 GitHub API，用户打开网页时不会请求 GitHub API。官网不读取 Tauri 的 `latest.json`，两套清单继续保持独立。需要立即同步时，可手动运行 `Sync latest app release` 工作流，或在本地执行 `pnpm sync:release`。

## 下载统计

- `src/data/download-stats.json` 是官网读取的静态下载统计快照；
- `.github/workflows/update-download-stats.yml` 每天生成一次累计快照并提交；
- 手动运行工作流默认会强制刷新；本地可执行 `pnpm update:stats`；
- 数据来自公开仓库 `gdhucoder/xianyun-releases` 的 Release Asset `download_count`；
- DMG、Windows 安装包、可单独识别的更新包和模型权重分别计算；签名、校验文件、说明文档和运行时不计入模型下载；
- Windows 安装与更新使用同一 EXE，GitHub 无法区分两种来源，网页会说明这一统计边界；
- 统计表示文件下载次数，不表示独立用户、成功安装或活跃用户。

## 更新截图

使用干净测试配置重新截图。至少由另一位人工检查者确认没有正文、凭据、姓名、单位、私有路径和仓库信息后，再复制到 `public/assets/screenshots/`。

应用 Release 也可以携带成对的 `site-<名称>.jpg` 和 `site-<名称>.avif`。
官网同步任务只接受固定允许列表、官方 Release 下载地址和不超过 5 MB 的有效图片，
通过后自动替换同名素材。没有截图资产时继续使用上一版，绝不从用户环境自动截屏。

## 依赖更新

只使用 Astro 官方文档支持的 Node 版本；升级 Astro 与官方 integration 后重新运行全部检查。Actions 使用官方主版本标签，升级时核对 Astro 和 GitHub 官方仓库的当前示例。
