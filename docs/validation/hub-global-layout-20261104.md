# CHG-20261104-HUB-GLOBAL-LAYOUT

Requirement: Smart Sync 的显示方式与无界同步一致，修改后提供截图。补充：两者描述统一为相同英文。

Use the same row classes, plugin name, installed-version/author metadata, English description, more menu, update-check button, history dropdown and selected-version installation label as the CN section. Global Alpha appears under the test-version dropdown group; no stable release is invented and no Alpha is selected automatically. The Global update button validates the published overseas index against pinned artifact hashes. Account, storage, downloaded ID and rollback state remain separate. Existing unverified pre-install snapshots stay explicitly unverified; only a user-confirmed mark enables the verified label.

The UI retains existing narrow-screen wrapping/touch sizing and aligns both desktop version-picker widths. The screenshot is a browser preview using the actual Page renderer and current public CN release feeds, with a DOM-compatible Obsidian API fixture and preview theme. It is explicitly labeled UI preview, not a native Obsidian screenshot. No plugin was installed into a vault to obtain it.

Windows Node 26.12.1: typecheck, Obsidian 1.12 compatibility, 45 automated tests and build pass. The preview confirms identical English descriptions, name/version/author styling, more-menu/update positions and selected-version controls; Global 1.1.4 is under the test group and defaults to no selection. No new public Hub release was published for this visual review.

Windows/macOS/Linux/Android/iPhone/iPad native host, touch, background and restart acceptance remain unverified; no sync content, source mtime or service behavior changes. Downloads and confirmations retain existing failure/cancellation boundaries. No formal vault is modified.

Follow-up authorization: after reviewing the screenshot and its explicit native-acceptance limits, the user said “可以，发布吧”. Prepare and publish Hub 0.1.29 using the same source and standard release/Community checks. Smart Sync remains version 1.1.4 in the Alpha group; its archived Community listing is not changed. This version-specific authorization does not turn any pending native device test into a pass.

## Publication receipt — 0.1.29

- Release source: e36c241bdd953cbd2a506f2073655477750b6742; https://github.com/adventurer2008/wujie-hub/releases/tag/0.1.29, published with three assets, not a draft or prerelease.
- Windows Node 26.12.1: typecheck, Obsidian 1.12 compatibility, all 45 tests, build and release/platform-policy/Community-identity checks pass.
- GitHub Release run 41784592695 and Checks run 41784586256 both succeeded; release artifact attestations generated and verified.
- Anonymous HTTPS downloads match local build bytes: main.js SHA-256 022db748fc94614c4bafe158b40cc511e9376b2bedcc8dacf5abda86d5502094; manifest.json ddb5a994b6cfea078b38fe2f40c933b6b259d6f32224b36b0cad77441bba3836; styles.css 77a0c7ddd6aee236edc4872658325d73900b6b78b5e2b9b2178f56112dcb8db1.
- The new update-check implementation successfully validated the actual public Global Alpha index and reported latest supported Alpha 1.1.4.
- Community manual release detection queued the scan, then review Completed with release attestation, dependency, obfuscation and byte-for-byte build verification passing. Public https://community.obsidian.md/plugins/wujie-hub confirms Current version 0.1.29, Health Excellent and Review Passed.
- No sync service, formal vault, installed plugin configuration or Smart Sync Community archive state was changed. Physical platform acceptance remains pending as recorded above.
