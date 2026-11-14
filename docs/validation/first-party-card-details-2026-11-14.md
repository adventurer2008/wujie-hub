# Hub 自研插件卡片信息

CHG-20261114-HUB-FIRST-PARTY-CARD-DETAILS · Wujie Hub 0.1.33-alpha.1

用户验收发现，0.1.32 的无界译卡片只显示名称、地区和安装状态，缺少作者和简介。本次把无界同步、无界译、Smart Sync 的标题、安装状态、作者、简介及操作区交给同一个组件。简介和作者为本地默认信息，无需先下载插件或读取远端清单。安装后从本机 manifest 显示版本和作者。无界译简介采用该插件 manifest 的英文描述，与另外两张卡片语言一致。

| 平台 | 验证状态 |
| --- | --- |
| Windows | 类型、Obsidian 1.12 API 兼容、55 项自动化测试和构建通过。测试覆盖三张卡片的共同字段和安装控件，无界译分别覆盖已安装，以及未安装且清单不可用。维护者在独立 Obsidian 1.15.1 测试库确认无界译的简介和作者正确，随后授权晋升稳定版。 |
| macOS | 未验证，无物理设备参与本轮。 |
| Linux 桌面 | 未验证，无物理设备参与本轮。 |
| Android | 未验证，窄屏布局和触控待真机确认。 |
| iPhone/iOS | 未验证，窄屏布局和触控待真机确认。 |
| iPad/iPadOS | 未验证，分屏和触控待真机确认。 |

保持共用的窄屏换行规则和原有安装、摘要校验及备份恢复路径。此处为设置页展示，前后台同步、锁屏、跨设备版本、账号、数据迁移及源修改时间不涉及本次修改。

## 0.1.33 稳定版

CHG-20261114-HUB-033-STABLE。Alpha 固定提交 `fafb50b897fed58b084742336ccc3c00f17b3a4b`，Stable 标签固定提交 `cd91357cbb4df0b090c7db159c879ccadc1bc648`。运行源码、样式和构建入口一致，Windows 构建的脚本和样式与验收库逐字节一致。安装清单只变更版本号。

[跨平台 CI](https://github.com/adventurer2008/wujie-hub/actions/runs/43574547309) 和 [稳定版发布流程](https://github.com/adventurer2008/wujie-hub/actions/runs/43574620829) 已通过。[GitHub 最新正式版](https://github.com/adventurer2008/wujie-hub/releases/latest) 指向 0.1.33，匿名下载和校验结果如下。

| 安装文件 | SHA-256 |
| --- | --- |
| main.js | `9b6052aba8e326e6a6757f871fbbfb646aca76a4710bc379dfd4a631cafd5363` |
| manifest.json | `c727604bbef32514e0c92d7decb39979049a28de0ed4e406c0117b3c32f1ac10` |
| styles.css | `1765cd83fe01944c634af05cece6baa508d0a719f06f0268750aa833e327a6c5` |

线上清单和三个安装文件通过 Hub 的 ID、版本与摘要校验，无界同步 Stable 1.1.7 / Alpha 1.1.7-alpha.15，无界译 Stable 0.1.1 / Alpha 0.1.1-alpha.1，Smart Sync Stable 1.1.9 / Alpha 1.1.8-alpha.6。回退可使用 [0.1.32 的三个公开安装文件](https://github.com/adventurer2008/wujie-hub/releases/tag/0.1.32)，操作步骤见 [前版验收记录](first-party-release-picker-2026-11-14.md)。

在 Obsidian 社区后台触发 Check for new releases 后，0.1.33 / cd91357 审核完成，main.js 逐字节重建通过。[公开社区目录](https://community.obsidian.md/plugins/wujie-hub) 已显示 Current version 0.1.33、Health Excellent、Review Passed。
