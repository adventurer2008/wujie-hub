# Wujie Hub — 0.1.18

插件安装中心

在国内网络环境下，便捷搜索、安装和升级Obsidian官方社区插件，以及管理无界同步版本。

## Overview

Wujie Hub searches, installs, and updates Obsidian community plugins through GitHub download mirrors. Its single settings page also provides a dedicated Wujie Sync section for selecting stable and Alpha releases, checking SHA-256 digests, and restoring a local code version that the user has explicitly confirmed as working. The interface is in Chinese.

## Installation and usage

1. Download `main.js`, `manifest.json`, and `styles.css` from the [Wujie Hub release](https://github.com/adventurer2008/wujie-hub/releases/latest).
2. For manual installation, place those three files in `<config-dir>/plugins/wujie-hub/`, normally `.obsidian/plugins/wujie-hub/`. Preserve any existing `data.json` and all other files when replacing release files.
3. In Obsidian, open **Settings → Community plugins**, enable **Wujie Hub**, and open its settings page. You can also run the **打开插件管理** command (Open plugin manager).
4. Enter a plugin name, description, or ID in the search field. Select **安装** (Install), review the version and trust prompt, and confirm the download. New plugins remain disabled until you enable them in Obsidian's Community plugins settings.
5. Select **检查更新** (Check for updates) beside **已安装插件** (Installed plugins). Update an individual result with **加速更新** (Update through mirrors), or use **全部加速更新** (Update all through mirrors). Updates preserve each plugin's enabled state and configuration. The manager itself and Wujie Sync are excluded from ordinary updates.
6. In the Wujie Sync section, select **检查更新**, choose a version, then **安装所选版本** (Install selected version). To save a rollback target, use the more menu and **标记当前版本正常** (Mark current version as working) only after testing that version yourself. The rollback button restores code, preserving current configuration; it cannot undo configuration or remote data migrations.

The manager changes only `manifest.json`, `main.js`, and `styles.css` in target plugins, with local release-file backups under `<config-dir>/pmcn-backups/`. Use Obsidian's own settings to enable, disable, or uninstall plugins. See the Chinese instructions below for recovery details and the source-build workflow.

## Network and privacy

- `raw.githubusercontent.com` supplies the official community plugin directory and plugin manifests; `api.github.com` supplies release metadata and available file digests; `github.com` supplies release downloads and may redirect them to GitHub's file distribution services.
- Third-party proxies `ghfast.top`, `gh-proxy.com`, `gh.llkk.cc`, `ghproxy.net`, `gh.monlor.com`, and `wget.la` relay GitHub requests to improve access from China. Metadata checks try some sources in parallel; file downloads switch sources after failures. Proxies can see the GitHub URLs they relay. Ordinary community downloads do not have independently trusted publisher hashes; install only plugins and sources you trust. A matching Wujie digest establishes consistency with its metadata, not an author signature.
- `sync.wujiesync.cc` supplies the Wujie Sync Alpha feed. Opening this plugin's settings page automatically refreshes that feed; manual update checks also request it. Release files are downloaded after confirmation.
- An optional custom HTTPS `feedUrl` supplies Wujie release metadata when configured. Confirmed installs request the HTTPS file URLs specified by that feed.

Search terms are matched locally and are not uploaded as search parameters. Request URLs identify the requested repository, version, or file; remote services receive the request IP address and ordinary HTTP headers. This plugin requests catalogs, metadata, and release files. It does not upload notes, attachments, plugin settings, `data.json`, or rollback backups. Its cache, configuration, and backups remain local. The manager requires no account or payment; installed plugins have their own requirements and policies.

## Compatibility and license

Requires Obsidian **1.12.0 or later** and allows installation on Windows, macOS, Linux, Android, and iOS/iPadOS. Desktop-only target plugins are rejected on mobile before any file mutation. This version is released at the maintainer's request before real-device acceptance; mobile and minimum-version runtime acceptance remain pending. See [the acceptance checklist](docs/MOBILE-ACCEPTANCE.md). Automated checks on Windows, macOS and Linux do not establish Obsidian real-device acceptance. Internal plugin-management APIs may change; unsupported interfaces stop the operation. Backups do not provide a transaction that survives every crash or forced shutdown.

Copyright 2026 Wujie Sync. Licensed under the [Apache License 2.0](LICENSE).

单页 Obsidian 社区插件管理器，中文名为“插件安装中心”。

## 安装与使用

1. 从 [Wujie Hub 最新发行版](https://github.com/adventurer2008/wujie-hub/releases/latest)下载 `main.js`、`manifest.json`、`styles.css`。
2. 手动安装时，将三个文件放入 `<配置目录>/plugins/wujie-hub/`，配置目录通常是 `.obsidian`。仅替换这三个发行文件，保留已有 `data.json` 及其他文件。
3. 在 Obsidian 第三方插件设置中启用 Wujie Hub，然后打开它的设置页面。也可使用“打开插件管理”命令。
4. 搜索名称、描述或 ID，输入即筛选，点击“安装”确认版本后下载。已安装的搜索结果只显示状态，不提供启用或卸载功能。新装插件默认禁用，请到官方第三方插件设置中启用。更新保留原启用状态。
5. “已安装插件”区仅显示“检查更新”按钮；检查后只列出有更新的插件，支持单独或全部加速更新。启用、禁用和卸载使用官方界面。批量操作跳过管理器自身和 `wujie-sync`。

从源码构建需要 Node.js、npm 和 Python 3.9+；Python 用于 Alpha 清单发布工具的自动测试。执行 `npm ci`、`npm run check`、`npm test`、`npm run build`，然后按上述方式复制生成的 `dist/wujie-hub` 文件夹，保留目标库已有的 `data.json`。

默认卸载只移除发行文件，保留用户配置。安装、更新、卸载的发行文件备份保存在 `<配置目录>/pmcn-backups/`；备份是本机数据，不应上传或复制到其他设备。失败恢复也失败时，请停止继续安装，按提示找到快照恢复发行文件并重启。

## 无界同步

专属区支持版本清单、指定版本安装、SHA-256、手动确认正常版本和本机 Rollback。正常版本只有点击“标记当前版本正常”才保存。回退只恢复代码，不恢复配置或远端数据迁移。

默认读取官方国内发行仓库的公开 Release，无需编辑配置。点击无界同步“检查更新”后可选择历史版本；Alpha 测试版排在前面，最多显示最新3个，稳定版随后最多显示最新5个，共用“安装所选版本”按钮。正式版仍读取原国内发行库；Alpha 默认读取下载站的[完整发布清单](https://sync.wujiesync.cc/download/alpha/releases.json)，不需要 GitHub 预发布，也不依赖本机累积旧 Alpha 记录。下载站成功返回后，以其版本列表为准。本机已确认的回退目标独立保留。已验证从完整清单读取1.1.2-alpha.2与1.1.2-alpha.1，安装alpha.2并离线回退成功；测试期间同步插件禁用，不代表 Alpha 功能或同步实机验收。也可由开发者配置自有 HTTPS 清单（feedUrl）。

在无界同步更多菜单中选择“标记当前版本正常”，确认后保存本机代码快照和摘要。随后出现“回退至版本号”，点击即可离线恢复代码，当前配置保留。安装其他版本不会覆盖回退目标。首次安装 Alpha 前若无目标，会要求你明确确认当前版本已验证正常。

发行文件依据清单 SHA-256 核对；GitHub 元数据经加速代理取得时，这表示文件与该元数据一致，不等同于作者签名或独立的来源认证。回退不会撤销配置或云端数据迁移，不能保证任意旧版本兼容新版数据。

清单结构：

```json
{
  "releases": [
    {
      "version": "1.2.3",
      "channel": "Alpha",
      "baseUrl": "https://YOUR-OSS-HOST/wujie-sync/BUILD-ID/",
      "sha256": {
        "manifest.json": "64位十六进制哈希",
        "main.js": "64位十六进制哈希",
        "styles.css": "64位十六进制哈希"
      },
      "rollbackSafe": false
    }
  ]
}
```

以上是结构示例，不是现有生产版本或可访问地址。列表按最新到最旧排列，默认选第一条 Alpha；版本必须匹配安装包的 manifest。可选 styles.css 不存在时省略其哈希。清单 HTTPS 来源本身必须可信。`rollbackSafe` 是发布方声明，不能证明所有配置/云端状态都能逆向迁移。

## 当前边界

- 已内置六个候选 GitHub 加速源，缓存最后成功源并顺序失败切换，最后尝试直连。尚未做三网测速或竞速调度，不承诺某源持续可用。
- 社区目录来自官方目录，经加速通道下载，本地缓存支持断网后搜索。普通插件按 GitHub latest 正式 Release 安装，支持数字 `x.y.z` 标签；不支持非标准标签。
- 社区发行文件尚未接入可信发布哈希，安装前要求确认信任来源；目前只能检查格式、ID、版本和最低应用版本。无界同步独立清单支持 SHA-256。
- OSS 社区目录缓存和社区文件缓存需要后续接入。社区插件当前仍依赖公共加速源或直连；无界同步 Alpha 已接入下载站完整发布清单。
- 本版本最低声明 Obsidian 1.12.0，开放移动端安装；已补齐 1.12 设置页回退路径、移动端窄屏布局和桌面专用插件拒绝规则。按维护者要求先发布、后统一测试，移动端及最低版本运行时验收仍待补充，不能把自动测试视为所有平台实机验收通过。参见 [移动端验收清单](docs/MOBILE-ACCEPTANCE.md)。
- Obsidian 插件安装、启停、刷新使用内部插件管理接口，集中在 `src/compat.ts`，接口不兼容时停止操作。备份恢复并非断电事务；崩溃或强制退出后可能需要手动恢复。

## 网络服务与数据范围

插件使用以下远程服务获取社区目录、版本信息和发行文件：

- `raw.githubusercontent.com`：读取 Obsidian 官方社区插件目录，以及需要查询的插件 manifest。
- `api.github.com`：查询社区插件的最新正式 Release，以及无界同步国内发行仓库的历史 Release 和文件摘要。
- `github.com`：下载用户选择的插件发行文件；GitHub 可能将下载重定向至其文件分发服务。
- 第三方 GitHub 加速代理 `ghfast.top`、`gh-proxy.com`、`gh.llkk.cc`、`ghproxy.net`、`gh.monlor.com`、`wget.la`：转发上述 GitHub 请求，以改善国内访问。版本查询会并行尝试部分来源，文件下载按来源失败切换。代理可看到所转发的 GitHub 地址；文件摘要一致不等同于作者签名。
- `sync.wujiesync.cc`：每次打开本插件设置页时自动读取无界同步 Alpha 完整发布清单，手动检查更新也会读取；确认安装后下载该清单所列发行文件。
- 可选的自定义 HTTPS `feedUrl`：配置后用于获取无界同步版本清单；确认安装后会请求清单指定的 HTTPS 文件地址。这些地址由清单提供方决定。

搜索关键词在本机匹配，不作为搜索参数上传。请求的 URL 包含所查询的仓库、版本或文件路径，服务提供方可以接收到请求 IP 和常规 HTTP 请求头。当前代码只请求目录、版本元数据及发行文件，不上传笔记、附件、插件配置、`data.json` 或本机回退备份；缓存、配置和备份保存在本机。管理器不要求账号或付费；被安装插件自身的网络、账号和付费要求由对应插件说明。

## 验证

`npm test` 覆盖配置保留、写入失败恢复、启用状态恢复、自身保护、卸载备份、并发互斥。

`tests/smoke.ts` 是只用于独立测试库的真实 Obsidian 测试入口，不能安装到日常库；它会创建测试插件、故意触发加载失败、测试恢复、下载并以禁用状态安装真实社区插件。`test-output/vault/smoke-result.json` 保存本机执行结果。

当前界面：进入页面不列社区插件；输入关键词后最多五条结果。已安装插件只保留同行检查更新及检查后有更新的列表。无界同步使用同样的名称、版本、作者和描述行；更多菜单可标记正常版本，已保存目标后主行显示一键回退按钮。

0.1.9：Alpha 从下载站完整发布清单读取，管理器只展示最新3个；稳定版仍从 GitHub 渠道读取最新5个，限流时使用随包分发的已核验元数据。历史版本下拉按渠道分组，共用“安装所选版本”按钮；不再提供独立“安装最新 Alpha”按钮或累积本机旧 Alpha 记录。

## Alpha 发布工具

`scripts/publish-alpha.ps1` 需要 PowerShell、SSH/scp、服务器端 Python 3.9+，以及自行配置的发布服务器、SSH 目标和密钥。服务器须已配置上传目录、下载站目录和既有发行清单；仓库不含凭据。脚本上传并校验发行文件后，通过 `scripts/update-alpha-index.py` 刷新完整 Alpha 清单、最新版本指针及合并清单，写入前备份清单。

后续发布Alpha使用 scripts/publish-alpha.ps1，传入 PackageDirectory（三个插件发行文件所在目录）、RootTarget、IdentityFile。脚本自动生成版本信息和摘要、上传独立版本目录、执行服务端 scripts/update-alpha-index.py 更新完整清单。已发布版本不可覆盖；正式版入口、应用服务和用户配置不变。也可在完成目录上传后执行服务端更新工具。上传与清单更新需要发布账号及root维护权限，脚本不保存密钥。

0.1.10：每次进入设置页面自动后台读取下载站Alpha并更新下拉，打开时不查GitHub；无界同步的检查更新按钮同时刷新Alpha和稳定版。读取失败保留上次结果并提示。

## 许可证

Copyright 2026 Wujie Sync. 本项目采用 [Apache License 2.0](LICENSE)。
