# 下载 manifest 维护

唯一数据源：`src/data/download-manifest.json`。

## 状态语义

- `available`：页面显示下载按钮；必须同时存在真实 HTTPS Release Asset URL、版本、文件名、大小和 SHA-256；
- `preparing`：版本准备中，不显示可点击下载；
- `coming-soon`：产品计划中或仍在验收，不显示可点击下载；
- `unavailable`：当前渠道不可用，不显示可点击下载。

`scripts/validate-download-manifest.mjs` 在 `check` 和 `build` 前运行。校验会拒绝 Markdown 链接、非 `xianyun-releases` 的下载源、缺失 SHA-256，以及在非 available 状态下残留的下载字段。

## CNB 手动下载镜像

`downloadUrl` 始终保留 GitHub 原件。可选的 `cnbDownloadUrl` 仅接受
`https://cnb.cool/hugd/xianyun-releases/-/releases/download/v<当前版本>/<同一文件名>`。
填写前须对实际镜像下载重新核对大小和完整 SHA-256，与 GitHub 原件一致，
再启用官网的“CNB 下载／GitHub 备用”。两边共用原有文件元数据，不重新编译或签名。
该字段缺失或为 null 时，页面自动回到原 GitHub 入口。

公开仓库无需下载者登录 CNB。CNB 只镜像完整安装包；应用内自动更新、本地模型
修复与下载统计的来源仍保持原状。当前统计只计 GitHub，不包括 CNB 下载。
不上传私有源码、凭据、用户数据、MG24 自用版或尚未正式发布的本地改动。

发布同步保留同版本、同文件名、同大小和同哈希的已核验镜像；版本或资产变化时
清空 CNB 地址，不能猜测新镜像已经存在。手动维护脚本支持可选的
`--cnb-download-url=<已核验地址>`，并在文件身份变化或平台下架时清除旧镜像。

2026-11-13 首阶段上线：公开版 v0.1.19 的 Mac ARM64 DMG（190697568 字节）
和 Windows x64 EXE（384063969 字节）原样同步到 CNB；两者均匿名完整回读并
核对 SHA-256，与原 GitHub 制品一致。下载页和两个安装说明页复用
`DownloadSources.astro`，显示“CNB 下载／GitHub 备用”。未更改应用内更新，
未重建安装包，未上传 MG24 自用版。新版本是否提供 CNB 地址仍须单独核验。

## 自动同步

`.github/workflows/sync-latest-release.yml` 每 6 小时读取一次 `gdhucoder/xianyun-releases` 的公开 Latest Release。同步只在同时满足以下条件时写入：

- Release 已正式发布，且不是 prerelease；
- 标签符合 `v<semver>`；
- macOS DMG 与 Windows Setup EXE 各有且只有一个；
- 文件名中的版本和 Release 标签一致；
- GitHub Asset 元数据包含 SHA-256 digest；
- Release Notes 含有带项目符号的 `## 本次更新` 小节。

流程会同时更新下载 manifest 和当前版本的简洁更新摘要，完整验证通过后才提交 `main`。浏览器访问官网时不会实时调用 GitHub API。

## 手动维护脚本

示例：

```bash
pnpm update:downloads -- \
  --platform=macos-arm64 \
  --status=available \
  --version=0.1.6 \
  --published-at=2026-08-01T00:00:00Z \
  --release-page-url=https://github.com/gdhucoder/xianyun-releases/releases/tag/v0.1.6 \
  --download-url=https://github.com/gdhucoder/xianyun-releases/releases/download/v0.1.6/example.dmg \
  --file-name=example.dmg \
  --size-bytes=12345678 \
  --sha256=<64-lowercase-hex>
```

该脚本保留用于临时修正单个平台状态，只修改当前仓库的本地 JSON，不修改发布仓库，也不下载资产。正常发版应优先使用自动同步，后续版本必须通过相同的不可变元数据校验。
