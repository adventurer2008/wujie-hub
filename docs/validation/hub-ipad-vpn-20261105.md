# CHG-20261105-HUB-GLOBAL-NETWORK-FALLBACK

Requirement: investigate latest Hub reporting Smart Sync refresh failure on iPad while phone/PC work. User confirmed different Wi-Fi and VPN on iPad, then confirmed disabling VPN immediately restores Hub refresh on that same device. This isolates the reported failure to that VPN access path; DNS/routing/TLS or provider filtering has not been distinguished. No reinstall, server deployment, domain/R2 change or new Hub release is required for the reported recovery.

Independent code review found native-request failure fallback supported only the domestic public download host. Extend the same bounded, credential-free WebView fetch fallback to the exact Global https://smartsync.cc/download/ path. Exclude URL credentials, other origins/ports and account/payment paths. Native HTTP failures, malformed JSON, digest/identity validation remain failures; no mirror/origin substitution. If both transports fail, preserve both errors in the existing inline refresh warning and retain last valid cache.

This is a tested source candidate, not a published fix or VPN bypass. Current anonymous Global download response has no Access-Control-Allow-Origin, so cross-origin WebView fallback still depends on coordinated public-static CORS support. No such server change was made/requested in this investigation; the other chat owns in-progress HA/Caddy topology. Existing native transport remains first. A VPN that blocks both paths still fails safely. Do not claim native iPad verification of the new fallback from the user's existing-version recovery.

Windows Node26.12.1: npm run check, check:compat, all 53 tests (zero skip), npm run build passed. New tests cover Global feed/asset fallback; no fallback to foreign/account/proxy/credential URLs; preserved HTTP/JSON errors; combined native/WebView failure. Existing regional identity, SHA, failed-download/no-write and rollback tests remain. Anonymous live feed returned HTTP200; its six published dates parsed in actual Chromium and WebKit. Browser-engine/date checks do not establish iPad network behavior.

| Platform | Status |
| --- | --- |
| Windows | Automated Node checks passed; native new fallback unverified |
| macOS | Existing conditional support; native new fallback unverified |
| Linux desktop | Existing conditional support; native new fallback unverified |
| Android | Existing conditional support; native new fallback unverified |
| iPhone/iOS | Existing conditional support; native new fallback unverified |
| iPad/iPadOS | User confirms existing Hub refresh works with VPN off; new fallback unverified |

No UI/native API, vault/credential/configuration migration, content/key/progress/source-mtime changes. Network error occurs before installation; old cache is retained. Narrow/touch controls unchanged, no layout change. Lock/background/restart/disconnect/native mixed-version install acceptance is not inferred. Candidate rollback is program code only and never modifies business data. Initial diagnosis left 0.1.30 unchanged; no public assets/tag overwritten.

## Release authorization — 0.1.31

After disclosure, the user explicitly requested publication with “那发布出去吧” on 2026-11-05. Prepare a new immutable 0.1.31 release; retain all prior assets/tags. This authorizes release before new native fallback acceptance, not a declaration that it passed. Existing CORS/VPN limits remain in release notes. No server/Caddy/domain/R2 changes are part of this release. Publication, artifact hashes and Community version will be recorded only after verification.

## Published receipt — 2026-11-05

- Release: https://github.com/adventurer2008/wujie-hub/releases/tag/0.1.31 ; immutable source 97570db5b68879cfddbfe579656aa7c3195fedf9.
- Local final candidate: metadata/platform/identity gates, typecheck, Obsidian1.12 compile, 53 tests with no skip and build passed. GitHub Checks41982397976 (Windows/macOS/Linux Node automation) and Release41982403915 succeeded. These are not native-device acceptance.
- Anonymous HTTPS downloads of main.js, manifest.json and styles.css matched the local build byte-for-byte and GitHub asset digests. SHA256: main.js 2ac79acea18c4aea3626f825a82af18b47a8c0dec2b038f5bbce7e795d8b151b ; manifest.json f37e559a7e25cd949f2c3bbf676a3239636113d1077a19e673c9194a0d51f670 ; styles.css 5286b2d610bd8dfd7bbfef52c43e396b935e6af1ff344a6c4c00fbb7c6a87c3e . Local receipt outside Git: C:/Users/lihy/.config/smart-sync-global/hub031-20261105/publication.json.
- Added explicit English release notes describing native-first bounded fallback, preserved validation, pending new native acceptance and the public-static CORS/VPN limitations. No server changes are claimed.
- Used Community management Check for new releases. Review for0.1.31/97570db completed: asset attestations, dependencies, obfuscation and byte-for-byte main.js build reproduction passed. Public https://community.obsidian.md/plugins/wujie-hub verified Current version0.1.31, Health Excellent, Review Passed.
- Prior assets/tags preserved. No local user vault installation or data/configuration mutation was performed. New native fallback and cross-origin static download behavior remain subject to the limits above.
