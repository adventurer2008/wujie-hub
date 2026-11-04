import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
await build({
  entryPoints: ["src/smart-sync.ts"],
  outfile: "test-output/smart-sync.mjs",
  bundle: true,
  format: "esm",
  platform: "node",
  alias: { obsidian: "./tests/obsidian-stub.ts" },
});
const {
  downloadSmartSync,
  SMART_SYNC_ALPHA,
  checkSmartSyncAlpha,
  SMART_SYNC_ALPHA_FEED,
} = await import("../test-output/smart-sync.mjs");

test("Smart Sync update checks use the Global index and validate pinned digests", async () => {
  const release = {
    version: "1.1.4",
    channel: "Alpha",
    sha256: SMART_SYNC_ALPHA.sha256,
  };
  assert.match(
    await checkSmartSyncAlpha({
      json: async (url) => {
        assert.equal(url, SMART_SYNC_ALPHA_FEED);
        return { pluginId: "smart-sync-global", releases: [release] };
      },
    }),
    /最新版本 1.1.4/,
  );
  await assert.rejects(
    checkSmartSyncAlpha({
      json: async () => ({ pluginId: "wujie-sync", releases: [release] }),
    }),
    /格式错误/,
  );
  await assert.rejects(
    checkSmartSyncAlpha({
      json: async () => ({
        pluginId: "smart-sync-global",
        releases: [{ ...release, sha256: {} }],
      }),
    }),
    /不匹配/,
  );
  assert.match(
    await checkSmartSyncAlpha({
      json: async () => ({
        pluginId: "smart-sync-global",
        releases: [release, { version: "1.1.5" }],
      }),
    }),
    /更新 Hub/,
  );
});

test("Global Alpha downloads only the pinned overseas release and rejects altered files", async () => {
  const requested = [];
  await assert.rejects(
    downloadSmartSync({
      get: async (url) => {
        requested.push(url);
        return url.endsWith("manifest.json")
          ? '{"id":"wujie-sync","version":"1.1.4"}'
          : "altered";
      },
    }),
    /文件校验失败/,
  );
  assert.deepEqual(
    requested,
    ["manifest.json", "main.js", "styles.css"].map(
      (file) => SMART_SYNC_ALPHA.baseUrl + file,
    ),
  );
  assert.ok(
    requested.every((url) =>
      url.includes("obsidian-smart-sync-release-global/"),
    ),
  );
  assert.ok(Object.isFrozen(SMART_SYNC_ALPHA.sha256));
});

test("offline download fails without silently switching to domestic files", async () => {
  let requests = 0;
  await assert.rejects(
    downloadSmartSync({
      get: async () => {
        requests++;
        throw Error("offline");
      },
    }),
    /offline/,
  );
  assert.equal(requests, 1);
});
