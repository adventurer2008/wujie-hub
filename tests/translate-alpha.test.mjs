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
const { loadTranslateAlpha, downloadTranslateAlpha } = await import("../test-output/translate-alpha.mjs");
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
