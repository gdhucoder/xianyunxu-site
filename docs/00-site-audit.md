# 纤云叙官网 V1：环境与资料审计

> 审计日期：2026-07-20
> 审计性质：只读检查。创建本文件前未修改 `VoiceDesktop` 或 `xianyun-releases`。

## 1. GitHub 与本地环境

- 当前登录 GitHub 账户：`gdhucoder`。
- `gh`：2.95.0，认证有效；Git 操作使用 HTTPS。
- Node.js：24.18.0，由 fnm 提供。
- pnpm：11.13.0。
- 当前工作区根目录本身不是 Git 仓库。
- 官网位于工作区 sibling directory `xianyunxu-site/`；审计前不存在。
- 预计 GitHub Pages 地址：<https://gdhucoder.github.io/xianyunxu-site/>。

## 2. 三个仓库的实际状态

| 角色 | 仓库 | 可见性 | 状态 |
| --- | --- | --- | --- |
| 桌面应用源码 | `gdhucoder/VoiceDesktop` | Private | 存在；默认分支为 `master`，当前开发分支为 `asr/sensevoice-gates` |
| 二进制与模型发布 | `gdhucoder/xianyun-releases` | Public | 存在；正式应用 Release 与独立模型 pre-release 已发布 |
| 产品官网 | `gdhucoder/xianyunxu-site` | 计划 Public | GitHub 与本地在审计前均不存在；需要新建 |

三个仓库可以保持完全独立。官网只引用公开 Release Assets，不复制桌面应用业务源码、模型权重或发布凭据。

## 3. 产品名称核对

私有仓库的已冻结品牌决策明确规定：

- 中文正式名：`纤云叙`；
- 英文正式名：`XianYun AI Voice Input`；
- `Xianyunxu`、`Qianyunxu` 不作为对外英文正式名；
- `xianyunxu-site` 仅作为仓库名和项目站点路径。

本任务标题和 manifest 示例中出现的 `Qianyunxu` 与现有冻结决策不一致。官网将以本任务背景中再次确认的 `XianYun AI Voice Input` 为准，避免引入第三套英文名称。

## 4. 可复用品牌资源

以下资源可从私有仓库只复制公开品牌资产，不携带业务源码：

- 主 Logo：`brand-assets/xianyun/logo/xianyun-c-v2-master.svg`；
- 小尺寸 Logo：`brand-assets/xianyun/logo/xianyun-c-v2-small.svg`；
- 1024 px App 图标：`brand-assets/xianyun/png/app/xianyun-c-v2-1024.png`；
- 128/64/32/16 px 图标候选；
- 已冻结的品牌色与文案规则：`docs/brand/`；
- 已有官网结构线框仅可作为设计参考，不当作真实产品截图。

Logo 为 C-v2“星空口述成文”正式方向：人物位于左下，文本纸张位于右上。官网使用生产 SVG/PNG，不重新绘制、不使用旧“言印”资产。

## 5. 产品截图审计

私有仓库中未发现经过公开脱敏确认的主窗口、历史页、本地模型页真实截图。现有 `website-brand/*-wireframe.*` 是设计线框，不是真实产品截图。

V1 处理方式：使用统一 `ScreenshotFrame` 明确显示“产品截图待补”，不伪造界面。后续应从干净测试账户重新截取并人工检查：

- 无真实转写正文；
- 无 API Key、用户姓名、单位信息或私人文件路径；
- 无私有仓库、开发终端或测试用户数据。

## 6. 当前公开下载资产

当前正式 Release：`v0.1.5`，发布时间为 2026-07-20。

### macOS Apple Silicon

- DMG：`XianYunAIVoiceInput_0.1.5_aarch64.dmg`；
- 大小：9,889,518 bytes；
- SHA-256：`b48e30505c9e917152fe85f6929b3a4cadf354fa0332f5ad386dd023705231d9`；
- 下载：<https://github.com/gdhucoder/xianyun-releases/releases/download/v0.1.5/XianYunAIVoiceInput_0.1.5_aarch64.dmg>；
- Release：<https://github.com/gdhucoder/xianyun-releases/releases/tag/v0.1.5>。

该版本使用固定自签名身份，但没有 Apple Developer ID，也没有 Apple notarization。官网必须以受控测试 Beta 描述，并提供安全的手动打开说明。

### Windows x64

公开 Release 包含 `XianYunAIVoiceInput_0.1.5_x64-setup.exe`。初始 V1 根据当时范围将 Windows 标为 `coming-soon`；2026-07-20 用户确认开放后，官网已更新为 `available`，并补充独立安装说明、SHA-256 与未代码签名风险提示。

### 本地模型

- macOS 模型说明：<https://github.com/gdhucoder/xianyun-releases/releases/tag/model-sensevoice-small-q8-macos-arm64-v1>；
- Windows 模型说明：<https://github.com/gdhucoder/xianyun-releases/releases/tag/model-sensevoice-small-q8-windows-x64-v1>；
- q8 权重大小：254,208,320 bytes；
- SHA-256：`4ae45c94422de949b387e2e0fb10d7e14e4c42c69db30c3444ecc7d4b844b7c5`。

模型由应用内用户主动安装；官网只解释数据路径并链接说明页，不托管或复制模型。

## 7. 已有说明与隐私事实

可复用的已确认事实：

- 本地 ASR 只表示语音识别阶段在本机完成；启用云端 LLM 时，文本仍可能发送至用户配置的服务；
- 云端 ASR 会把语音数据发送给相应服务；
- 本地历史使用 SQLite，并按 `off / stats_only / final_only / raw_and_final` 策略保存；
- 设计基线默认 `stats_only + 30 天 + 自动删除临时音频`；
- 模型权重保存在当前平台应用数据目录，只有用户明确操作才下载；
- API Key 不返回前端，不应写入普通日志；
- 注入失败时存在剪贴板降级，LLM 失败时可回退基础文本。

仍需在官网隐私页标记“待产品实现确认”的内容：

- 诊断日志的精确保留期限和一键导出/删除边界；
- 是否默认收集任何崩溃报告；
- 每一个可配置云端 Provider 的完整数据保留政策；
- 临时音频在所有失败路径上的最终清理时机。

## 8. 缺失资料

1. 经过公开脱敏确认的真实产品截图；
2. Apple Developer ID 与 notarization；
3. Windows 11 x64、ARM64 和企业安全策略的进一步人工验收结论；
4. 正式法律隐私政策审阅；
5. 商标与图形权利的正式法律清查；
6. Intel Mac 构建与支持计划；
7. 价格、许可证或长期发布渠道决策；
8. 自定义域名。

以上缺失不会阻止受控 Beta 官网 V1，但页面必须使用事实语言，不作正式稳定版承诺。

## 9. 计划新增的官网文件

- Astro、TypeScript、pnpm 配置与锁文件；
- `.github/workflows/ci.yml` 与 `deploy-pages.yml`；
- 首页、下载、macOS 安装、隐私、更新日志、FAQ、自定义 404；
- 统一布局、Header、Footer、下载卡片、流程、FAQ、状态提示、截图占位等组件；
- `src/data/download-manifest.json`、类型、构建时校验与本地更新脚本；
- CSS Design Tokens、响应式与 reduced-motion 样式；
- Logo、favicon、Apple Touch Icon、OG 图片和 robots；
- 部署维护、下载 manifest、截图准备与自定义域名迁移文档；
- 静态链接和构建输出检查脚本。

## 10. 阻塞项结论

没有阻止建立和部署官网 V1 的技术阻塞项。

发布边界（初始 V1，已被后续更新部分取代）：官网先提供 macOS Apple Silicon `0.1.5` Beta；真实产品截图使用明确占位；隐私页对未核实细节标注“待产品实现确认”。后续已开放 Windows x64 Beta 并补充真实脱敏截图。

## 9. 2026-07-20 截图补充记录

V1 发布后，已使用 macOS 0.1.5 安装版真机补充四张公开素材：首页运行准备、脱敏历史筛选、本地 SenseVoiceSmall 状态和录音状态浮层。历史页只显示本轮公开测试句；浮层截图只保留底部中央的录音波形与中性背景；全部图片均未显示 API Key、个人姓名、单位信息、私有文件路径或仓库信息。官网占位已替换为 AVIF + JPEG 响应式图片。

## 10. 2026-07-20 Windows 下载开放记录

用户确认官网开放 v0.1.5 Windows x64 Beta。已通过 GitHub Release API 和实际文件下载核对 `XianYunAIVoiceInput_0.1.5_x64-setup.exe`：大小 `5,208,405` bytes，SHA-256 `0111210bd1bd1629fb6ab7ba38bc2f17712f9ef22ee190e2948599625d1f4d19`。当前安装包未使用 Windows 代码签名；Windows 10 x64 已有实机证据，Windows 11 x64、ARM64 与不同安全策略仍标记为需要进一步确认。
