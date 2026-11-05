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

No UI/native API, vault/credential/configuration migration, content/key/progress/source-mtime changes. Network error occurs before installation; old cache is retained. Narrow/touch controls unchanged, no layout change. Lock/background/restart/disconnect/native mixed-version install acceptance is not inferred. Candidate rollback is program code only and never modifies business data. Release remains 0.1.30; no public assets/tag overwritten.
