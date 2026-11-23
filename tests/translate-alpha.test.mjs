import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { build } from "esbuild";

await build({
  entryPoints: ["src/wujie-translate.ts"],
  outfile: "test-output/translate-alpha.mjs",
  bundle: true,
  format: "esm",
  platform: "node",
  alias: { obsidian: "./tests/obsidian-stub.ts" },
});
const { loadTranslateAlpha, downloadTranslateAlpha, loadWordRelease, downloadWordRelease } = await import("../test-output/translate-alpha.mjs");
const version = "0.1.0-alpha.1";
const base = "https://user.wujiesync.cc/download/translate/alpha/";
const assets = {
  "manifest.json": JSON.stringify({ id: "wujie-translate", version }),
  "main.js": "module.exports = class Translate {};",
  "styles.css": ".translate { display: block; }",
};
const sha256 = Object.fromEntries(Object.entries(assets).map(([name, bytes]) =>
  [name, createHash("sha256").update(bytes).digest("hex")]));
const release = { id: "wujie-translate", channel: "Alpha", version, baseUrl: base + version + "/", sha256 };
const feed = { schemaVersion: 1, pluginId: "wujie-translate", channel: "Alpha", latest: version, releases: [release] };

test("Hub finds domestic Translate Alpha and checks every install file", async () => {
  const fetched = [];
  const net = {
    json: async url => {
      assert.equal(url, base + "releases.json");
      return feed;
    },
    get: async url => {
      assert.ok(url.startsWith(release.baseUrl));
      const name = url.slice(release.baseUrl.length);
      fetched.push(name);
      return assets[name];
    },
  };
  const checked = await loadTranslateAlpha(net);
  assert.equal(checked.version, version);
  assert.deepEqual(await downloadTranslateAlpha(net, checked), assets);
  assert.equal(fetched.length, 3);
  await assert.rejects(downloadTranslateAlpha({ get: async () => "changed" }, checked), /文件校验失败/);
});

test("Hub refuses a feed for another plugin or a different download host", async () => {
  await assert.rejects(loadTranslateAlpha({ json: async () => ({ ...feed, pluginId: "wujie-sync" }) }));
  await assert.rejects(loadTranslateAlpha({
    json: async () => ({ ...feed, releases: [{ ...release, baseUrl: "https://example.org/" }] }),
  }));
});

test("Hub installs only a hash-verified Word Editor Stable bundle", async () => {
  const base = "https://user.wujiesync.cc/download/word/stable/";
  const version = "1.0.0";
  const manifest = JSON.stringify({ id: "wujie-word", version });
  const bundle = { ...assets, "manifest.json": manifest };
  const sha256 = Object.fromEntries(Object.entries(bundle).map(([name, content]) => [name, createHash("sha256").update(content).digest("hex")]));
  const release = { id: "wujie-word", channel: "Stable", version, baseUrl: base + version + "/", sha256 };
  const feed = { schemaVersion: 1, pluginId: "wujie-word", channel: "Stable", latest: version, releases: [release] };
  const net = {
    json: async url => { assert.equal(url, base + "releases.json"); return feed; },
    get: async url => {
      assert.ok(url.startsWith(release.baseUrl));
      return bundle[url.slice(release.baseUrl.length)];
    },
  };
  const checked = await loadWordRelease(net);
  assert.deepEqual(await downloadWordRelease(net, checked), bundle);
  await assert.rejects(downloadWordRelease({ get: async () => "changed" }, checked), /文件校验失败/);
  await assert.rejects(loadWordRelease({ json: async () => ({ ...feed, pluginId: "wujie-translate" }) }), /格式错误/);
});
