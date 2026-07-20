# 下载 manifest 维护

唯一数据源：`src/data/download-manifest.json`。

## 状态语义

- `available`：页面显示下载按钮；必须同时存在真实 HTTPS Release Asset URL、版本、文件名、大小和 SHA-256；
- `preparing`：版本准备中，不显示可点击下载；
- `coming-soon`：产品计划中或仍在验收，不显示可点击下载；
- `unavailable`：当前渠道不可用，不显示可点击下载。

`scripts/validate-download-manifest.mjs` 在 `check` 和 `build` 前运行。校验会拒绝 Markdown 链接、非 `xianyun-releases` 的下载源、缺失 SHA-256，以及在非 available 状态下残留的下载字段。

## 安全更新脚本

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

脚本只修改当前仓库的本地 JSON，不调用 GitHub API，不修改发布仓库，也不下载资产。写入前会再次校验。

Windows x64 已于 `0.1.5` 开放为 `available`。Release 元数据与实际下载文件均已核对：文件大小 `5,208,405` bytes，SHA-256 为 `0111210bd1bd1629fb6ab7ba38bc2f17712f9ef22ee190e2948599625d1f4d19`。后续版本仍必须通过同样的不可变元数据校验后才能更新。
