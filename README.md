# 纤云叙产品官网

## 新版公开版内容准备（2026-11-11）

本地网站已按系统麦克风＋本地识别的公开版方向整理。AI 文字整理是可选设置，不作为首次试录前提；文件转写、多人分离不再作为首页能力。新增五组真实界面组件的合成预览，均带来源说明，不冒充真实账户截屏或干净 Mac 验收。

当前公开下载仍由现有 manifest 对应的 v0.1.18 提供，新版完整包尚未发布，旧制品链接、大小、哈希及历史日志不变。首用断网实测已暂停，不能对外承诺固定首用时间。官网内容独立更新，不等于新版应用发布。

素材来源与维护边界见 `docs/screenshot-guidelines.md` 和 `docs/site-maintenance.md`。

### 首页产品演示（2026-11-12）

首页加入跨应用语音听写的预设演示，支持播放、暂停、重播与减少动态效果；聊天窗口只填入示例结果，不发送消息。演示不申请麦克风权限，不调用 ASR 或大模型。录音条为放大示意，快捷键不指定真实按键。独立对照页保留在 `/preview/dictation/`，不参与搜索索引。

场景文案、分镜时间与波形参数集中在 `src/data/dictation-demo.json`；组件位于 `src/components/demo/`，播放生命周期与时间线位于 `src/lib/dictation-demo-*`。首页通过 `src/components/Hero.astro` 复用同一组件。修改后运行完整验证；演示不构成真实识别速度、准确率或已发布版本的证据。

`xianyunxu-site` 是 **纤云叙 · XianYun AI Voice Input** 的公开静态官网。

官网与以下仓库相互独立：

- 私有桌面应用源码：`gdhucoder/VoiceDesktop`；
- 公开安装包、更新清单和模型：[`gdhucoder/xianyun-releases`](https://github.com/gdhucoder/xianyun-releases)；
- 公开官网：`gdhucoder/xianyunxu-site`。

本仓库不得包含桌面应用业务源码、API Key、Updater 私钥、签名凭据、用户数据、私有语料、模型权重、DMG 或 EXE。

## 技术栈

- Astro 7.1.1，纯静态输出；
- TypeScript 6.0.3，strictest；
- pnpm 11.19.0；
- Astro Components + 原生 CSS；
- GitHub Pages 官方 Actions 部署；
- 无 React、无 UI 框架、无数据库、无后端、无远程字体、无分析 Cookie。

## 本地开发

```bash
pnpm install --frozen-lockfile
pnpm run dev
```

完整验证：

```bash
pnpm test
pnpm run check
pnpm run build
pnpm run check:site
```

本地预览的项目路径与线上保持一致：

```text
http://localhost:4321/xianyunxu-site/
```

## 内容维护

- 当前下载版本和简洁更新摘要每 6 小时从公开 Latest Release 自动同步；
- 下载次数由 GitHub Actions 每天北京时间 06:00 更新 `src/data/download-stats.json`；
- 发布前必须运行 manifest 校验、类型检查、静态构建和站内链接检查；
- 产品截图需经过 `docs/screenshot-guidelines.md` 的隐私检查；
- 当前更新日志由自动同步生成，其他长期内容仍在 `src/content/changelog/` 中管理；
- `dist/` 不提交 Git。

详见：

- [`docs/site-maintenance.md`](docs/site-maintenance.md)
- [`docs/download-manifest.md`](docs/download-manifest.md)
- [`docs/custom-domain-migration.md`](docs/custom-domain-migration.md)
- [`docs/00-site-audit.md`](docs/00-site-audit.md)

## 发布状态

当前官网开放 macOS Apple Silicon 与 Windows x64 Beta，具体版本由公开 Latest Release 自动同步。安装与系统提示说明以官网常见问题为准。

## License

Website source and brand assets are all rights reserved. Third-party packages retain their own licenses. See [`LICENSE`](LICENSE).
