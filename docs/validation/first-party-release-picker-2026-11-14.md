# 自研插件版本选择

CHG-20261114-HUB-FIRST-PARTY-RELEASE-PICKER · Wujie Hub 0.1.32-alpha.4

用户要求 Hub 内自研插件统一使用「检查更新」及下一行的版本下拉和「安装所选版本」。无界同步、无界译和 Smart Sync 共用同一个版本选择控件。选项按稳定版和测试版分组，默认选择可用的最新稳定版。无界译用户手选版本在仍可用时保留，安装前重新读取所选渠道的清单。

| 平台 | 验证状态 |
| --- | --- |
| Windows | Obsidian 1.15.1 独立测试库实测三张卡片均显示统一控件，确认无界译默认显示 0.1.1。维护者确认三张卡片显示正确。实际安装操作及重启后的插件使用未验收。 |
| macOS | 未验证，暂无本轮物理设备。 |
| Linux 桌面 | 未验证，暂无本轮物理设备。 |
| Android | 未验证，窄屏及触控待真机验收。 |
| iPhone/iOS | 未验证，窄屏及触控待真机验收。 |
| iPad/iPadOS | 未验证，触控及分屏待真机验收。 |

Windows 通过类型检查、Obsidian 1.12 接口兼容检查、55 项自动化测试及构建。自动化覆盖三张卡片的控件结构、无界译默认选择和手选版本失效后的回退选择。沿用已有窄屏换行和安装失败恢复逻辑。使用真实国内下载站验证无界译 Stable 0.1.1、Alpha 0.1.1-alpha.1 的清单、三个文件摘要、插件 ID 和版本。使用合成输入确认国内匿名接口可返回三词典和整句译文。实际宿主的触控、断网恢复和重启后操作未验收。版本控件无后台同步、账号或库数据迁移逻辑，锁屏和多设备状态迁移不涉及此次布局改动。

本候选装入独立 Windows 测试库。2026-11-14 维护者确认三张卡片显示正确，并要求将本候选晋升到生产稳定版。

## 0.1.32 稳定版发布

CHG-20261114-HUB-032-STABLE。固定来源为 Alpha `0ff5a90524fad215649095ed827943f9f3660213` 和 Stable `bed9e43cfccb3b95ea31657fcac825a2b2ddd94b`。两者运行源码、构建入口和样式的 Git 内容一致。Windows 构建的 main.js 和 styles.css 与验收库逐字节一致。公开 Linux 构建的 main.js 也逐字节一致，styles.css 与 Git 源文件逐字节一致，和 Windows 文件仅换行符不同。

[GitHub 跨平台检查](https://github.com/adventurer2008/wujie-hub/actions/runs/43560824824) 在 Windows、macOS、Ubuntu 通过。[发布流程](https://github.com/adventurer2008/wujie-hub/actions/runs/43560920689) 通过。Hub 发布标签和 GitHub latest 均指向 0.1.32，确认无预发布或草稿标记。匿名下载的三个公开安装文件 SHA-256 与 GitHub 一致，manifest ID 为 `wujie-hub`，最低宿主为 1.12.0。

| 公开发行文件 | SHA-256 |
| --- | --- |
| main.js | `5eb30d8124d6169845de84870dcd5961e16615bbad28fcb254b15720708b31db` |
| manifest.json | `29e1bf4ca719e867fb142598d29ddda189709cfcccce24b76791bebd44270824` |
| styles.css | `1765cd83fe01944c634af05cece6baa508d0a719f06f0268750aa833e327a6c5` |

复用 Hub 清单和安装文件校验代码，实取无界同步 Stable 1.1.7 与 Alpha 1.1.7-alpha.15、无界译 Stable 0.1.1 与 Alpha 0.1.1-alpha.1、Smart Sync Stable 1.1.9 与 Alpha 1.1.8-alpha.6。六套各三个下载文件的摘要、插件 ID 和包内版本均通过。

GitHub 保留 [0.1.31 标签和三个安装附件](https://github.com/adventurer2008/wujie-hub/releases/tag/0.1.31) 作为上一稳定版的手动恢复来源。关闭 Obsidian 后替换 Hub 的三个发行文件，保留现有 data.json，重启后检查 Hub 版本。此前未进行旧版读取新版缓存的真机验证。

Obsidian 社区管理页触发 Check for new releases 后，`0.1.32 / bed9e43` 审核 Completed。发布证明、依赖、混淆检查及 main.js 逐字节重建通过。[公开社区目录](https://community.obsidian.md/plugins/wujie-hub) 显示 Current version 0.1.32、Health Excellent、Review Passed。国内品牌站的独立 ZIP 链接仍显示 0.1.27，当前稳定版通过 Obsidian 社区目录与 GitHub 发布。
