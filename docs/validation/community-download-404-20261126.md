# Community plugin update with optional stylesheet

CHG-20261126-HUB-COMMUNITY-DOWNLOAD-404. The reported Android screenshot shows four mirror 404 responses, a mirror timeout, a mirror TLS error and GitHub HTTP 404. Hub 0.1.35 reproduced that sequence with valid required assets and an absent optional stylesheet. The screenshot does not show which repository or file was being fetched.

The new download path accepts a missing optional stylesheet after a direct GitHub 404 and keeps the failure when direct GitHub is unreachable or returns another error. Any successfully downloaded stylesheet remains part of the package. A missing manifest or script still blocks installation, and errors name the repository, version and asset. The GitHub and mirror host rules remain in effect.

| Platform | Validation |
| --- | --- |
| Windows | Type checks, Obsidian 1.12 API compatibility, automated regression and build. Native Obsidian acceptance pending. |
| macOS and Linux | Shared download code supports both. Native acceptance pending. |
| Android | Reported on device. Matching network responses reproduced automatically. Matching live update on the reporting device remains pending. |
| iPhone and iPad | Shared download code supports both. Native transport, touch and retry acceptance pending. |

Automated coverage includes mixed network failures, required asset failures and existing installer rollback and configuration protection. The change uses the existing foreground downloader and installer. Background synchronization, source modification times, and account encryption are outside this update path. For manual testing, use an isolated vault and back up the three current Hub release files for rollback. Retain the existing settings file.

Live verification downloaded the real manifests and scripts for Note Folder Autorename 0.1.2 and Hotkeys for Specific Files 1.4.1. With real GitHub HTTP 404 for both absent stylesheets and synthetic mirror failures, the fixed downloader returned both valid bundles. On the first-party feeds, all three file hashes matched for Wujie Sync Stable 1.1.12 and Alpha 1.1.12-alpha.3, and Smart Sync Stable 1.1.10 and Alpha 1.1.8-alpha.6.
