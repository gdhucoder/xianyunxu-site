# 公开产品截图检查

只有在确认截图不包含以下内容后，才能复制到 `public/assets/screenshots/`：

- 用户真实转写正文；
- API Key、Token 或凭据状态细节；
- 个人姓名、单位内部信息或私人文件路径；
- 私有仓库、开发终端或测试用户数据。

V1 已发布素材：

- `home-dashboard-macos.avif` / `.jpg`；
- `history-sanitized-macos.avif` / `.jpg`；
- `local-model-macos.avif` / `.jpg`；
- `status-overlay-recording-macos.avif` / `.jpg`。

这些图片来自 `/Applications/XianYunAIVoiceInput.app` 的真实 macOS 0.1.5 窗口。历史页先通过应用内搜索只保留本轮公开测试句，再进行截图；首页只保留运行状态、权限和统计区域；模型页没有展开高级诊断或路径。状态浮层通过应用内“测试浮层”序列触发，只截取当前显示器底部中央的浮层与中性背景，不包含 Dock 或其他应用。截图后裁掉了桌面控制工具标记，没有修改产品界面内容。

每张图片提供 AVIF 与 JPEG 回退；主窗口图片为 960 × 692，状态浮层图片为 640 × 300。新增或替换素材时，应继续使用真实安装版、公开测试句和同等人工检查流程。未通过检查的页面必须保留明确占位，不制作伪造产品界面。
