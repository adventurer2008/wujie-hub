# CHG-20261104-HUB-GLOBAL-ALPHA

Request: 把smart sync 也放到hub里面，阿尔法版本可供下载。

## Implementation

- Add an explicitly confirmed Smart Sync Alpha channel, pinned to existing Global 1.1.4 assets without rewriting the published version, tag or files.
- Embedded SHA-256 checks cover every release file; ID, version and host compatibility are checked before installation. Reuse existing download mirrors and transactional installer. Failed downloads never unload or write target files.
- Separate Global code rollback snapshot; retain both regional configurations and domestic rollback state. Exclude Global from generic/bulk upgrades. New installs stay disabled, enabled updates retain enabled state.
- No changes to sync services, account data, websites, formal vaults or Smart Sync Community archive state. Only Hub source and release change.

## Acceptance boundaries

| Platform | Status | Reason |
| --- | --- | --- |
| Windows | Unverified in native Obsidian | Automated renderer, download and installer checks are not native host acceptance |
| macOS | Unverified | No physical device used |
| Linux | Unverified in native Obsidian | CI process is not native Obsidian acceptance |
| Android | Conditional support; unverified | Obsidian 1.12.7+, mobile adapter; touch and narrow screen pending |
| iPhone / iOS | Conditional support; unverified | Obsidian 1.12.7+, sandbox/network and touch pending |
| iPad / iPadOS | Conditional support; unverified | Same host requirements; split-view pending |

Offline downloading must fail before installation; existing plugins remain intact. Mixed regional IDs and settings are tested independently. Host minimum-version and desktop-only checks use the existing installer. Code backup/recovery does not undo data migrations or guarantee crash survival. Lock-screen/background interruption and restart recovery remain unverified. Source file mtime and synchronization are not modified by this change; no note content is read or written.

## Executed validation

- Windows Node 26.12.1: typecheck, Obsidian 1.12 API compatibility check, all 44 automated tests, build, release metadata, platform-policy and community-identity gates passed.
- Anonymous HTTPS download of the actual Global 1.1.4 manifest, main.js and styles.css through the new downloader passed all three pinned SHA-256 checks; manifest ID smart-sync-global, version 1.1.4, minAppVersion 1.12.7, mobile allowed.
- Tests cover explicit Alpha confirmation/cancellation, generic-update bypass rejection, download failure without installation or domestic rollback changes, regional identity/config preservation, disabled first install, installer rollback and mobile desktop-only rejection.
- Actual Global package also passed an in-memory Hub install, independent pre-install snapshot, rollback and CN/Global configuration-isolation drill. No physical vault was changed.
- GitHub Release 0.1.28 from c8e979dbe3fa979fd2834ff376d966c0d46605ea published successfully; Actions run 41782242772 passed checks, build and artifact attestations. Anonymous downloads of all three Hub release assets match local build bytes.
- Community review Completed; public https://community.obsidian.md/plugins/wujie-hub shows Current version 0.1.28, Health Excellent and Review Passed. Smart Sync archive state was not changed.
- Overseas static mirror is live at https://smartsync.cc/download/ with the same Global 1.1.4 files, ZIP, checksums and Alpha index. All public files verified. Hub 0.1.28 itself uses the pinned GitHub release with existing mirrors.
- No native platform pass is claimed.
