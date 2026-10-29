# Official Wujie download publication

Alpha and stable feeds and install files are served under `https://user.wujiesync.cc/download/`. Wujie Hub does not fall back to the old official host or GitHub for Wujie installation files. Ordinary community plugin mirrors are separate.

Alpha publication uses `scripts/publish-alpha.ps1` and `scripts/update-alpha-index.py`. Immutable old version metadata is retained; generated indexes use the new domain.

For stable mirroring, first update the pinned release inventory in `src/wujie-history.json` from verified official GitHub release metadata. Then run `scripts/prepare-stable-downloads.ps1 -OutputDirectory <stage>` to download and check every file, upload that stage to the publication server, and run `scripts/publish-download-mirror.py --stage <server-stage>` with publication privileges. The publisher checks identity and hashes, preserves existing version files, locks publication, backs up mutable indexes, and rolls back indexes on failure. It does not restart application services.

Run `scripts/verify-download-site.py` from a machine with working HTTPS access. It checks both channels, every listed release file and ZIP against published hashes, and rejects redirects outside the new download site. Retain its JSON receipt. Existing backups are under `/var/backups/wujie-download-index/`; inspect current state before restoring a specific backed-up index.

Future stable releases must be mirrored and verified on this site before they appear in Wujie Hub. Publishing a GitHub release alone no longer updates Wujie's stable feed. Never fabricate missing download files, metadata or hashes.
