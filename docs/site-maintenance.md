# 官网部署与维护

## 发布边界

官网只保存产品介绍、脱敏截图、下载元数据和公开文档。安装包、Updater 文件和模型继续由 `gdhucoder/xianyun-releases` Release Assets 承载。

### 新版公开版内容与部署边界（2026-11-11）

- 对外只展示系统麦克风、本地识别、可选文字整理；专用蓝牙输入只在个人自用版保留，不在官网推广。不再推广文件转写与多人分离。
- 首页采用新版合成界面预览，FAQ 与隐私页同步区分原话直出、四种整理方式、范围确认、历史录音与导出副本规则。
- 新装完整包准备内置模型，更新复用有效模型；首用两步、不要求配置 LLM。这些是已实现的候选能力，不是当前公开下载包的声明。干净 Mac 断网验收已暂停；不填入首用耗时，不声称 Windows 已实机通过。
- 实际公开下载仍为 `v0.1.18`，链接、大小、SHA-256、签名状态及已发布日志不变。官网顶部及下载/安装页保留“新版预览尚未发布”说明。
- `preview-*` 图片与发布同步的旧同名图片隔离，避免旧版 Release 同步覆盖新预览。`preview-provenance.json` 与门禁固定检查五组图、配对格式、哈希及来源图注。
- 初稿阶段仅本地更新。用户后续批准官网提交、推送和上线；采用带跳过 CI 标记的提交后，单独手动运行网站 Pages 部署。不得触发应用 CI、安装包编译、GitHub Release 或模型发布；不改应用版本、发布制品、更新端点、用户数据或日常安装。

本轮验证：同步远端维护更新后，网站 34 项测试通过，0 失败、0 跳过；Astro/TypeScript 检查 49 个文件，0 错误；构建 9 页，并校验 46 个产物的页面、站内资源与预览契约。同步前的 21 项测试报告也保留。应用侧界面回归 229 项通过，正常类型检查与合成渲染入口的独立类型检查通过。Chrome 中检查了桌面和窄屏首页、窄屏下载导航，未见横向溢出，下载链接仍对应旧公开制品。这些不代替原生试录或真人模型质量验收。

只想本地评审时，可在构建成功后运行 `node scripts/export-local-preview.mjs --output <新目录>`。它生成无需服务的本地 HTML 副本，内联样式和图片，内部页面互相链接；外部下载仍指向真实公开文件。此命令不发布、不提交、不上传。

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
2. Release 标签仅使用 `v<major.minor.patch>`（不接受 feature、alpha、beta、rc、构建后缀或模型标签），并且 draft/prerelease 均为 false，同时上传唯一的 macOS ARM64 DMG 和 Windows x64 Setup EXE；
3. 两个安装包必须带有 GitHub Release Asset 的 SHA-256 digest；
4. Release Notes 必须包含 `## 本次更新`，该小节只写面向用户的功能条目；
5. 安装限制、安全提示和排障内容继续放在官网常见问题，不写入“本次更新”；
6. 应用发布流程会立即向 `.github/workflows/sync-latest-release.yml` 发送事件；
   每小时读取公开 Releases 列表并选择最高合格版本 的定时任务继续作为无需跨仓库 Token 的兜底；
7. 流程自动更新 `download-manifest.json` 和 `current.md`，验证网站后提交 `main`；
8. 同步任务提交后会显式触发 GitHub Pages 重新部署，避免机器人提交不能连锁触发
   工作流的问题。

同步过程只在 GitHub Actions 构建时调用公开 GitHub API，用户打开网页时不会请求 GitHub API。官网不读取 Tauri 的 `latest.json`，两套清单继续保持独立。需要立即同步时，可手动运行 `Sync latest app release` 工作流，或在本地执行 `pnpm sync:release`。

## 下载统计

- `src/data/download-stats.json` 是官网读取的静态下载统计快照；
- `.github/workflows/update-download-stats.yml` 每天北京时间 06:00 生成一次累计快照并提交；
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

## 稳定发布保护

官网仅从 `main` 构建和部署；手动选择 feature 分支的部署、版本同步和统计刷新均跳过。
同步选择公开、非 draft、非 prerelease 的纯三段应用版本号，并校验安装包链接与同一标签及文件名一致。
GitHub 的正式发布标记表示发布渠道，不等于产品已结束 Beta；现有 Beta 和签名风险提示保持不变。
官网无法从公开分发仓库验证私有桌面源码分支的血缘，应用发布者仍须先人工验证正式 Release。
