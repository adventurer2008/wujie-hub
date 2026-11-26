import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';

globalThis.window = globalThis;
await build({
  stdin: { contents: 'export * from "./src/network"; export * from "./src/wujie-translate";', resolveDir: process.cwd() },
  outfile: 'test-output/first-party-failover.mjs', bundle: true, format: 'esm', platform: 'node',
  alias: { obsidian: './tests/obsidian-stub.ts' },
});
const { Network, loadTranslateRelease, downloadTranslateRelease, loadWordRelease, downloadWordRelease } =
  await import('../test-output/first-party-failover.mjs');
const origins = ['https://user.wujiesync.cc', 'https://key.106-15-232-208.sslip.io', 'https://new.106-15-232-208.sslip.io'];

for (const [id, path, load, download] of [
  ['wujie-translate', 'translate', loadTranslateRelease, downloadTranslateRelease],
  ['smart-word', 'smart-word', loadWordRelease, downloadWordRelease],
]) {
  for (const channel of ['Stable', 'Alpha']) {
    test(`${id} ${channel} checks and downloads through both alternates`, async () => {
      const version = channel === 'Stable' ? '1.0.1' : '1.0.1-alpha.1';
      const directory = `/download/${path}/${channel.toLowerCase()}/`;
      const assets = { 'manifest.json': JSON.stringify({ id, version }), 'main.js': 'module.exports={};', 'styles.css': '' };
      const sha256 = Object.fromEntries(Object.entries(assets).map(([name, text]) =>
        [name, createHash('sha256').update(text).digest('hex')]));
      const feed = { schemaVersion: 1, pluginId: id, channel, latest: version,
        releases: [{ id, version, channel, baseUrl: origins[0] + directory + version + '/', sha256 }] };
      for (const failed of [1, 2]) {
        const calls = [], saved = [];
        globalThis.__pmcnRequest = async ({ url }) => {
          calls.push(url);
          const target = new URL(url);
          if (origins.slice(0, failed).includes(target.origin)) return { status: 503, text: '' };
          if (target.pathname === directory + 'releases.json') return { status: 200, text: JSON.stringify(feed) };
          assert.ok(target.pathname.startsWith(directory + version + '/'));
          return { status: 200, text: assets[target.pathname.split('/').at(-1)] };
        };
        const network = new Network();
        network.configureWujieOrigin(origins[0], value => saved.push(value));
        const release = await load(network, channel);
        assert.deepEqual(await download(network, release), assets);
        assert.deepEqual(calls.slice(0, failed + 1), origins.slice(0, failed + 1).map(origin => origin + directory + 'releases.json'));
        assert.ok(calls.slice(failed + 1).every(url => new URL(url).origin === origins[failed]));
        assert.deepEqual(saved, [origins[failed]]);

        // A domain may fail after the index succeeds and before file download.
        let current = 0;
        globalThis.__pmcnRequest = async ({ url }) => {
          const target = new URL(url);
          if (target.pathname.endsWith('releases.json')) return { status: 200, text: JSON.stringify(feed) };
          current++;
          return target.origin === origins[0] ? { status: 502, text: '' } :
            { status: 200, text: assets[target.pathname.split('/').at(-1)] };
        };
        const switched = new Network();
        assert.deepEqual(await download(switched, await load(switched, channel)), assets);
        assert.equal(current, 4);
      }
    });
  }
}
