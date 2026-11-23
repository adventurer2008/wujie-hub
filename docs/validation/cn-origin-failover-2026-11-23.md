# 国内无界同步下载入口切换

CHG-20261123-CN-ORIGIN-FAILOVER。Hub 为国内无界同步下载记录上次可用的官方入口，在网络失败或临时网关错误后沿入口顺序切换。当前入口可用时继续使用。刷新和安装仍经过原版本、插件 ID、摘要和安装回退检查。自定义源、无界译和海外 Smart Sync 保留既有路径。

| 平台 | 支持与验收 |
| --- | --- |
| Windows | TypeScript、最低 Obsidian API 检查、自动化及构建通过。切换、重建网络实例后续用、错误 JSON 停止行为有回归。公司 Windows 插件宿主未验证。 |
| macOS | 标准 HTTPS 和插件本地设置条件支持，真机未验证。 |
| Linux 桌面 | 标准 HTTPS 和插件本地设置条件支持，真机未验证。 |
| Android | 依赖 Obsidian 原生网络或 WebView，真机未验证。 |
| iPhone/iOS | 依赖 Obsidian 原生网络或 WebView，真机未验证。 |
| iPad/iPadOS | 依赖 Obsidian 原生网络或 WebView，真机未验证。 |

无新界面，无正文、笔记库、账号、密钥或源 mtime 路径。插件重启由持久化配置承接，离线恢复、前后台及锁屏的物理设备行为未验证。安装只替换发行文件，旧 Hub 可读取既有设置。Obsidian 社区目录的稳定版本另行验收。
