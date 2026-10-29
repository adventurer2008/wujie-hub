import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
await build({
  entryPoints: ["src/wujie.ts"],
  outfile: "test-output/wujie.mjs",
  bundle: true,
  format: "esm",
  platform: "node",
  alias: { obsidian: "./tests/obsidian-stub.ts" },
});
const { parseReleases, hashes, verifyBundle, downloadWujie } =
  await import("../test-output/wujie.mjs");
const { recentReleases, parseSiteFeed, loadSiteAlpha } =
  await import("../test-output/wujie.mjs");

test("default selection is the highest stable version, never a test release", async () => {
  const { defaultReleaseVersion } = await import("../test-output/wujie.mjs");
  const rows = [
    { version: "9.0.0-alpha.1", channel: "Alpha", publishedAt: "2026-10-29" },
    { version: "1.9.0", channel: "Stable", publishedAt: "2026-10-29" },
    { version: "1.10.0", channel: "Stable", publishedAt: "2026-10-28" },
  ];
  assert.equal(defaultReleaseVersion(recentReleases(rows)), "1.10.0");
  assert.equal(defaultReleaseVersion([rows[0]]), "");
});

test("Alpha feed and cached downloads use the new official host without old-host fallback", async () => {
  const bundle = {
    "manifest.json": '{"id":"wujie-sync","version":"1.2.0-alpha.1"}',
    "main.js": "Alpha test fixture",
    "styles.css": "body{}",
  };
  const baseUrl = "https://sync.wujiesync.cc/download/alpha/1.2.0-alpha.1/";
  const entry = {
    version: "1.2.0-alpha.1",
    channel: "Alpha",
    baseUrl,
    sha256: await hashes(bundle),
    files: Object.fromEntries(
      Object.keys(bundle).map((file) => [file, { url: baseUrl + file }]),
    ),
  };
  const [parsed] = parseSiteFeed(
    { releases: [entry] },
    "https://user.wujiesync.cc/download/alpha/releases.json",
  );
  assert.equal(new URL(parsed.baseUrl).hostname, "user.wujiesync.cc");
  assert.ok(
    Object.values(parsed.fileUrls).every(
      (url) => new URL(url).hostname === "user.wujiesync.cc",
    ),
  );
  const requested = [];
  const net = {
    get: async (url) => {
      requested.push(url);
      assert.equal(new URL(url).hostname, "user.wujiesync.cc");
      return bundle[new URL(url).pathname.split("/").pop()];
    },
  };
  // Old data.json may retain either an old base URL or explicit per-file URLs.
  for (const fileUrls of [
    undefined,
    Object.fromEntries(
      Object.keys(bundle).map((file) => [file, baseUrl + file]),
    ),
  ]) {
    assert.deepEqual(await downloadWujie(net, { ...entry, fileUrls }), bundle);
  }
  assert.equal(requested.length, 6);
  const failed = [];
  await assert.rejects(
    downloadWujie(
      {
        get: async (url) => {
          failed.push(url);
          throw Error("offline");
        },
      },
      entry,
    ),
    /offline/,
  );
  assert.equal(failed.length, 1);
  assert.equal(new URL(failed[0]).hostname, "user.wujiesync.cc");
});
test("stable metadata and cached GitHub downloads use the new site with no GitHub fallback", async () => {
  const { loadWujieReleases } = await import("../test-output/wujie.mjs");
  const bundle = {
    "manifest.json": '{"id":"wujie-sync","version":"1.1.1"}',
    "main.js": "fixture",
    "styles.css": null,
  };
  const entry = {
    version: "1.1.1",
    channel: "Stable",
    baseUrl:
      "https://github.com/adventurer2008/obsidian-smart-sync-release-cn/releases/download/1.1.1/",
    sha256: await hashes(bundle),
  };
  const net = {
    json: async (url) => {
      assert.equal(url, "https://user.wujiesync.cc/download/releases.json");
      return { releases: [entry] };
    },
    get: async (url) => {
      assert.ok(
        url.startsWith("https://user.wujiesync.cc/download/stable/1.1.1/"),
      );
      return bundle[new URL(url).pathname.split("/").pop()];
    },
    fastJson: async () => {
      assert.fail("GitHub must not be queried");
    },
  };
  const releases = await loadWujieReleases(net);
  assert.equal(releases.length, 1);
  assert.ok(
    releases.every((r) => r.channel === "Stable" && r.sha256["main.js"]),
  );
  assert.equal(net.wujieHistoryCacheUsed, false);
  assert.deepEqual(await downloadWujie(net, entry), bundle);
  await assert.rejects(
    loadWujieReleases({
      ...net,
      json: async () => {
        throw Error("site offline");
      },
    }),
    /site offline/,
  );
});
test("history shows the newest five without mutating the full inventory", () => {
  const rows = Array.from({ length: 8 }, (_, i) => ({
    version: "1.0." + i,
    channel: "Stable",
    publishedAt: "2026-10-" + String(i + 10).padStart(2, "0"),
  }));
  assert.deepEqual(
    recentReleases(rows).map((r) => r.version),
    ["1.0.7", "1.0.6", "1.0.5", "1.0.4", "1.0.3"],
  );
  assert.equal(rows.length, 8);
});
test("history shows three site Alpha before five stable releases", () => {
  const rows = [
    ...Array.from({ length: 6 }, (_, i) => ({
      version: "1.2.0-alpha." + i,
      channel: "Alpha",
      publishedAt: "2026-10-" + String(i + 10),
    })),
    ...Array.from({ length: 8 }, (_, i) => ({
      version: "1.1." + i,
      channel: "Stable",
      publishedAt: "2026-10-" + String(i + 10),
    })),
  ];
  assert.deepEqual(
    recentReleases(rows).map((r) => r.version),
    [
      "1.2.0-alpha.5",
      "1.2.0-alpha.4",
      "1.2.0-alpha.3",
      "1.1.7",
      "1.1.6",
      "1.1.5",
      "1.1.4",
      "1.1.3",
    ],
  );
});
test("download-site metadata resolves plugin files and rejects HTTP file URLs", async () => {
  const feed = {
    releases: [
      {
        version: "1.1.2-alpha.1",
        channel: "Alpha",
        baseUrl: "./1.1.2-alpha.1/",
        sha256: { "manifest.json": "a".repeat(64), "main.js": "b".repeat(64) },
      },
    ],
  };
  const release = parseSiteFeed(
    feed,
    "https://user.wujiesync.cc/download/alpha/versions.json",
  )[0];
  assert.equal(
    release.fileUrls["main.js"],
    "https://user.wujiesync.cc/download/alpha/1.1.2-alpha.1/main.js",
  );
  const net = {
    get: async () => '<a href="alpha/versions.json">Alpha 清单</a>',
    json: async (url) => {
      assert.equal(
        url,
        "https://user.wujiesync.cc/download/alpha/releases.json",
      );
      return feed;
    },
  };
  assert.equal((await loadSiteAlpha(net))[0].version, "1.1.2-alpha.1");
  feed.releases[0].baseUrl = "http://sync.wujiesync.cc/download/";
  assert.deepEqual(
    parseSiteFeed(
      feed,
      "https://user.wujiesync.cc/download/alpha/versions.json",
    ),
    [],
  );
});
const assets = ["manifest.json", "main.js"].map((name) => ({
  name,
  digest: "sha256:" + "a".repeat(64),
}));
test("Alpha and stable remain distinct; drafts and incomplete packages are excluded", () => {
  const releases = parseReleases([
    {
      tag_name: "1.2.0-alpha.2",
      prerelease: true,
      draft: false,
      published_at: "2026-10-28",
      assets,
    },
    {
      tag_name: "1.1.1",
      prerelease: false,
      draft: false,
      published_at: "2026-10-27",
      assets,
    },
    {
      tag_name: "1.3.0",
      prerelease: false,
      draft: true,
      published_at: "2026-10-29",
      assets,
    },
    {
      tag_name: "1.0.0",
      prerelease: false,
      draft: false,
      published_at: "2026-10-26",
      assets: [],
    },
  ]);
  assert.deepEqual(
    releases.map((r) => [r.version, r.channel]),
    [
      ["1.2.0-alpha.2", "Alpha"],
      ["1.1.1", "Stable"],
    ],
  );
});
test("snapshot hashes reject corrupted rollback code", async () => {
  const bundle = {
    "manifest.json": '{"id":"wujie-sync","version":"1.1.1"}',
    "main.js": "original",
    "styles.css": null,
  };
  const expected = await hashes(bundle);
  await verifyBundle(bundle, expected);
  await assert.rejects(
    verifyBundle({ ...bundle, "main.js": "changed" }, expected),
    /校验失败/,
  );
});
test("numeric plugin version can belong to an explicitly labelled Alpha tag", async () => {
  const bundle = {
    "manifest.json": '{"id":"wujie-sync","version":"1.2.0"}',
    "main.js": "alpha fixture",
    "styles.css": null,
  };
  const release = {
    version: "1.2.0-alpha.2",
    fromGithub: true,
    channel: "Alpha",
    baseUrl: "https://example.invalid/",
    sha256: await hashes(bundle),
  };
  const net = { get: async (url) => bundle[new URL(url).pathname.slice(1)] };
  assert.deepEqual(await downloadWujie(net, release), bundle);
  await assert.rejects(
    downloadWujie(net, { ...release, version: "1.3.0-alpha.1" }),
    /版本与安装包不匹配/,
  );
});
