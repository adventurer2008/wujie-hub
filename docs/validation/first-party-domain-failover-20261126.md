# First-party download failover

CHG-20261126-HUB-PLUGIN-DOWNLOAD-FAILOVER. Smart Word and Wujie Translate now use the existing three-domain transport for Stable/Alpha version checks and all three installation files. The transport retains a working origin and switches again if a later file request fails. Existing plugin identity, version, SHA-256 verification, serialized installation and release-file rollback remain active.

The two alternate HTTPS hosts now expose only the public product indexes and manifest.json/main.js/styles.css paths for these products. Their contents come from the same release directories as the canonical download host. Nginx configuration was backed up, syntax checked and reloaded.

Both type checks and 64 automated tests passed, including Stable/Alpha for both products, one/two failed origins and failure between index and file download. The actual Hub Network and product loaders also downloaded live indexes and files with zero, one and two injected unavailable domains: 12 combinations passed identity, version and hashes. Evidence is under E:/SmartSync-Tests/releases/hub-0.1.37-stable-20261126/live-downloads.json.

Windows, macOS, Linux desktop, Android, iPhone/iOS and iPad/iPadOS share this transport and the existing native-first/WebView fallback. Physical-device failover, background/lock-screen/resume and device-specific TLS remain unverified on all platforms. Existing narrow-screen/touch controls are retained. Restart uses the persisted working endpoint. Old Hub versions retain their previous behavior. This feature does not write note content, sync keys, progress or source mtime. The domains share a server, so backend availability remains shared. The previous Hub release can be restored while preserving data.json.
