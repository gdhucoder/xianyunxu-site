# 纤云叙产品官网

`xianyunxu-site` 是 **纤云叙 · XianYun AI Voice Input** 的公开静态官网。

官网与以下仓库相互独立：

- 私有桌面应用源码：`gdhucoder/VoiceDesktop`；
- 公开安装包、更新清单和模型：[`gdhucoder/xianyun-releases`](https://github.com/gdhucoder/xianyun-releases)；
- 公开官网：`gdhucoder/xianyunxu-site`。

本仓库不得包含桌面应用业务源码、API Key、Updater 私钥、签名凭据、用户数据、私有语料、模型权重、DMG 或 EXE。

## 技术栈

- Astro 7.1.1，纯静态输出；
- TypeScript 6.0.3，strictest；
- pnpm 11.13.0；
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

- 下载版本只修改 `src/data/download-manifest.json`；
- 发布前必须运行 manifest 校验、类型检查、静态构建和站内链接检查；
- 产品截图需经过 `docs/screenshot-guidelines.md` 的隐私检查；
- 更新日志由 `src/content/changelog/` 下的 Markdown 文件管理；
- `dist/` 不提交 Git。

详见：

- [`docs/site-maintenance.md`](docs/site-maintenance.md)
- [`docs/download-manifest.md`](docs/download-manifest.md)
- [`docs/custom-domain-migration.md`](docs/custom-domain-migration.md)
- [`docs/00-site-audit.md`](docs/00-site-audit.md)

## 发布状态

当前官网将 macOS Apple Silicon `0.1.5` 标记为受控测试 Beta。安装包没有 Apple Developer ID，未经 Apple 公证。Windows 在官网中继续标记为开发中。

## License

Website source and brand assets are all rights reserved. Third-party packages retain their own licenses. See [`LICENSE`](LICENSE).
