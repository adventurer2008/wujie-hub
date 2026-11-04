# CHG-20261104-HUB-DYNAMIC-RELEASES

Requirements: 自动发现 Smart Sync 稳定版；不再为新增插件版本升级 Hub；普通已安装区不重复展示无界同步/Smart Sync，两者独立同样式卡片。用户确认此分区方案并要求修改后先截图。

Read schema-v1 https://smartsync.cc/download/releases.json when opening or checking Global releases; read both existing CN feeds on opening. New package versions and hashes are data, not compiled constants. Global stable and Alpha choices use channel/version keys so promotion of the same numeric version is unambiguous. Highest stable defaults; no automatic Alpha selection or automatic installation. Preserve explicit choices, last-valid cache, original identity/configuration and separate rollback targets. Stale/hidden responses cannot overwrite newer results. Reject foreign plugin IDs, unexpected asset hosts/directories, invalid digests, duplicate entries, malformed versions and unsupported schema versions. Exact downloaded ID/version/minimum-host checks remain before writes.

The current public unified index contains only actual 1.1.4 Alpha, whose three mirrored hashes are unchanged. No stable release is fabricated. Future publisher adds immutable files plus checksums, validates/updates the unified index and atomically publishes the static site; no Hub rebuild. Website utility and procedure: paired CHG in wujie-website/docs/global-release-index-2026-11-04.md. The endpoint was added while all existing website bytes, application InvocationIDs and Caddy configuration remained unchanged.

The preview uses actual settings renderer code, live release feeds and manifest metadata as installed-version UI fixtures; it does not load either sync plugin or access a vault/account. A preview does not establish native installation acceptance. Windows/macOS/Linux desktop, Android, iPhone/iOS and iPad/iPadOS native Obsidian checks remain unverified. Existing responsive wrapping/touch sizing remains; browser layout checks are reported separately. No service deployment, source mtime, note content, keys or sync state is changed.

User reviewed the screenshot and authorized publication with “可以，发布吧” on 2026-11-04. Release version: 0.1.30. Hub can still require maintenance for its own bugs, API or security changes; this removes the need for a Hub release solely because a plugin package version changed.

Candidate validation: type checks, Obsidian 1.12 compatibility compile, 51 automated tests and production build passed. Windows Chrome preview shows separate matching CN/Global cards using installed-version fixtures; screenshot C:/Users/lihy/.config/smart-sync-global/screenshots/hub-dynamic-releases-cards-20261104.jpg. This is browser layout evidence, not native Obsidian acceptance. Website build and 22-file English/link/hash checks passed. Live index and current three package hashes were verified during static index activation.

## Published receipt — 2026-11-04

- Public release: https://github.com/adventurer2008/wujie-hub/releases/tag/0.1.30
- Tagged source: 3e0ad41cc360fa3ff323f924912749b26ea7c04b. Paired website source: 93981a70943976aff1073d37c5161136aafbb98e.
- GitHub Checks 41787529930 and Release 41787550905 completed successfully, including artifact attestations.
- Anonymous download of all three public release assets matched the local build byte-for-byte: main.js SHA256 392f00a48f18623f64d710d36b56598edf4bb15eb90d9d9c64538c6b313ae171; manifest.json cee364be64c627637b6e70c6bc69aab7b4f3031a3e661aaecf78d70548f62d63; styles.css 5286b2d610bd8dfd7bbfef52c43e396b935e6af1ff344a6c4c00fbb7c6a87c3e.
- Live Global unified index and its three 1.1.4 Alpha files rechecked over HTTPS; all original digests matched. Isolated index utility checks covered future stable/Alpha entries, date preservation and tamper rejection without index changes. Website rebuild validated 23 files including the prior-index backup.
- Community manual new-release scan completed: version 0.1.30, commit 3e0ad41, Completed; artifact attestations, dependency and obfuscation checks passed, main.js reproduced byte-for-byte.
- Public https://community.obsidian.md/plugins/wujie-hub shows Current version 0.1.30, Health Excellent, Review Passed. Screenshot: C:/Users/lihy/.config/smart-sync-global/screenshots/hub-community-0.1.30.jpg.
- No native device acceptance or minimum-host runtime pass is claimed. No local vault installation, domestic service change or Smart Sync Community listing change was performed.
