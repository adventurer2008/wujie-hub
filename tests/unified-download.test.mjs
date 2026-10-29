import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
await build({ entryPoints: ['src/wujie.ts'], outfile: 'test-output/unified-download.mjs', bundle: true, format: 'esm', platform: 'node', alias: { obsidian: './tests/obsidian-stub.ts' } });
const { parseSiteFeed, loadWujieReleases } = await import('../test-output/unified-download.mjs');
const stable = { version: '1.2.0', channel: 'Stable', baseUrl: './stable/1.2.0/', sha256: { 'main.js': 'a'.repeat(64), 'manifest.json': 'b'.repeat(64), 'styles.css': 'c'.repeat(64) } };
test('unified feed recognizes stable and Alpha with independent channels', () => {
  const rows = parseSiteFeed({ pluginId: 'wujie-sync', releases: [stable, { ...stable, version: '1.2.1-alpha.1', channel: 'Alpha' }] }, 'https://user.wujiesync.cc/download/releases.json');
  assert.deepEqual(rows.map(row => row.channel), ['Stable', 'Alpha']);
  assert.equal(rows[0].fileUrls['main.js'], 'https://user.wujiesync.cc/download/stable/1.2.0/main.js');
});
test('stable loader prefers the user download site without Github requests', async () => {
  const requests = [];
  const rows = await loadWujieReleases({ json: async url => { requests.push(url); return { releases: [stable] }; }, fastJson: async () => { throw Error('Github should not be used'); } });
  assert.equal(rows[0].channel, 'Stable');
  assert.deepEqual(requests, ['https://user.wujiesync.cc/download/releases.json']);
});
test('unavailable unified site retains legacy stable source', async () => {
  const requests = [];
  const rows = await loadWujieReleases({ json: async url => { requests.push(url); if (requests.length === 1) throw Error('synthetic unavailable'); return { releases: [stable] }; } });
  assert.equal(rows.length, 1);
  assert.equal(requests[1], 'https://sync.wujiesync.cc/download/releases.json');
});
test('unified stable feed still rejects unsafe URLs and malformed digests', () => {
  for (const entry of [{ ...stable, baseUrl: 'http://unsafe.invalid/' }, { ...stable, sha256: { 'main.js': 'bad' } }])
    assert.deepEqual(parseSiteFeed({ releases: [entry] }, 'https://user.wujiesync.cc/download/releases.json'), []);
});
