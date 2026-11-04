import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { createHash } from "node:crypto";
await build({
  entryPoints: ["src/smart-sync.ts"],
  outfile: "test-output/smart-sync.mjs",
  bundle: true,
  format: "esm",
  platform: "node",
  alias: { obsidian: "./tests/obsidian-stub.ts" },
});
const {
  parseSmartSyncFeed,
  loadSmartSyncReleases,
  downloadSmartSync,
  SMART_SYNC_FEED,
  smartSyncReleaseKey,
} = await import("../test-output/smart-sync.mjs");
const hashes = (bundle) =>
  Object.fromEntries(
    Object.entries(bundle).map(([file, text]) => [
      file,
      createHash("sha256").update(text).digest("hex"),
    ]),
  );
const feed = (...releases) => ({
  schemaVersion: 1,
  pluginId: "smart-sync-global",
  releases,
});
function entry(version, channel = "Stable") {
  return {
    id: "smart-sync-global",
    version,
    channel,
    baseUrl: `https://smartsync.cc/download/${channel.toLowerCase()}/${version}/`,
    sha256: {
      "main.js": "a".repeat(64),
      "manifest.json": "b".repeat(64),
      "styles.css": "c".repeat(64),
    },
  };
}

test("future stable and Alpha versions load from one index without a Hub change", async () => {
  const result = await loadSmartSyncReleases({
    json: async (url) => {
      assert.equal(url, SMART_SYNC_FEED);
      return feed(entry("27.3.1"), entry("28.0.0-alpha.8", "Alpha"));
    },
  });
  assert.deepEqual(result.map(smartSyncReleaseKey), [
    "Stable:27.3.1",
    "Alpha:28.0.0-alpha.8",
  ]);
  assert.deepEqual(parseSmartSyncFeed(feed()), []);
});

test("promotion of the same version keeps stable and Alpha independently selectable", () => {
  assert.deepEqual(
    parseSmartSyncFeed(feed(entry("9.0.0"), entry("9.0.0", "Alpha"))).map(
      smartSyncReleaseKey,
    ),
    ["Stable:9.0.0", "Alpha:9.0.0"],
  );
  assert.throws(
    () => parseSmartSyncFeed(feed(entry("9.0.0"), entry("9.0.0"))),
    /重复/,
  );
});

test("reject foreign identity, unsupported schema, missing hashes and unsafe download addresses", () => {
  for (const value of [
    { ...feed(), pluginId: "wujie-sync" },
    { ...feed(), schemaVersion: 2 },
    feed({ ...entry("1.2.3"), id: "wujie-sync" }),
    feed({ ...entry("1.2.3"), sha256: {} }),
    feed({ ...entry("1.2.3"), channel: "Beta" }),
    feed(entry("1.2.3-alpha.1")),
    ...[
      "http://smartsync.cc/download/stable/1.2.3/",
      "https://evil.test/download/stable/1.2.3/",
      "https://smartsync.cc/download/stable/other/",
      "https://smartsync.cc/download/stable/1.2.3/?x=1",
      "https://user:pass@smartsync.cc/download/stable/1.2.3/",
    ].map((baseUrl) => feed({ ...entry("1.2.3"), baseUrl })),
  ])
    assert.throws(() => parseSmartSyncFeed(value));
});

test("future package download verifies every digest and exact regional ID and version", async () => {
  for (const [id, version, valid] of [
    ["smart-sync-global", "27.3.1", true],
    ["wujie-sync", "27.3.1", false],
    ["smart-sync-global", "27.3.2", false],
  ]) {
    const bundle = {
      "manifest.json": JSON.stringify({ id, version }),
      "main.js": "fixture",
      "styles.css": "body{}",
    };
    const release = { ...entry("27.3.1"), sha256: await hashes(bundle) };
    const requested = [];
    const net = {
      get: async (url) => {
        requested.push(url);
        return bundle[url.split("/").pop()];
      },
    };
    if (valid) assert.deepEqual(await downloadSmartSync(net, release), bundle);
    else await assert.rejects(downloadSmartSync(net, release), /不匹配/);
    assert.equal(requested.length, 3);
    assert.ok(requested.every((url) => url.startsWith(release.baseUrl)));
    await assert.rejects(
      downloadSmartSync(
        {
          get: async (url) =>
            url.endsWith("main.js") ? "tampered" : bundle[url.split("/").pop()],
        },
        release,
      ),
      /文件校验失败/,
    );
  }
});

test("offline and cached unsafe releases fail without installation or origin fallback", async () => {
  await assert.rejects(
    downloadSmartSync(
      {
        get: async () => {
          throw Error("offline");
        },
      },
      entry("1.2.3"),
    ),
    /offline/,
  );
  await assert.rejects(
    downloadSmartSync(
      {
        get: async () => {
          throw Error("should not download");
        },
      },
      { ...entry("1.2.3"), baseUrl: "https://evil.test/" },
    ),
    /官方下载目录/,
  );
});
