# Plugin Manager CN

- TypeScript + Obsidian API + esbuild. Single settings page, three sections.
- Preserve target data.json and all non-release files. Never manage this plugin itself.
- Serialize mutations. Download before unloading. Backup and recover release files on failure.
- Internal Obsidian APIs belong in compat.ts. Mobile support requires real device acceptance.
- Never call a loaded version user-verified automatically. Ordinary bulk updates exclude Wujie.
- Do not invent production OSS endpoints or hashes. Document missing publication dependencies.
- Render every first-party plugin through the shared card. Show the plugin name, installed version or not-installed state, author, and a short feature description that is visible before installation and when feeds are unavailable. Place Check for updates above a version dropdown and one Install selected version button. Group available versions by channel and keep test versions opt-in. Check both installed and uninstalled cards when adding a first-party plugin.
- Run npm run check and npm test and npm run build before delivery.
- After every release, verify the public Obsidian Community listing shows the released version. If it has not synced, use the listing management page's "Check for new releases" action and wait for review completion. Report the release complete only after the public community version matches; otherwise report the concrete blocker and leave completion unconfirmed.
