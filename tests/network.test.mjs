import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
globalThis.window = globalThis;
await build({
  entryPoints: ["src/network.ts"],
  outfile: "test-output/network.mjs",
  bundle: true,
  format: "esm",
  platform: "node",
  alias: { obsidian: "./tests/obsidian-stub.ts" },
});
const { Network } = await import("../test-output/network.mjs");

test("China downloads retain the working endpoint across restarts and reject malformed data", async () => {
  const primary = "https://user.wujiesync.cc";
  const key = "https://key.106-15-232-208.sslip.io";
  const alternate = "https://new.106-15-232-208.sslip.io";
  const feed = "/download/alpha/releases.json";
  const calls = [], saved = [];
  globalThis.__pmcnRequest = async ({ url }) => {
    calls.push(url);
    return new URL(url).origin === alternate
      ? { status: 200, text: '{"releases":[]}' }
      : { status: 503, text: "unavailable" };
  };
  const network = new Network();
  network.configureWujieOrigin("https://untrusted.test", (origin) => saved.push(origin));
  assert.deepEqual(await network.json(primary + feed, true), { releases: [] });
  assert.deepEqual(calls, [primary + feed, key + feed, alternate + feed]);
  assert.deepEqual(saved, [alternate]);
  const restarted = new Network();
  restarted.configureWujieOrigin(saved[0], () => assert.fail("healthy endpoint should remain selected"));
  calls.length = 0;
  await restarted.json(primary + feed, true);
  assert.deepEqual(calls, [alternate + feed]);
  globalThis.__pmcnRequest = async ({ url }) => {
    calls.push(url);
    return { status: 200, text: 'invalid JSON' };
  };
  calls.length = 0;
  await assert.rejects(restarted.json(primary + feed, true), SyntaxError);
  assert.deepEqual(calls, [alternate + feed]);
});

test("official download transport failure uses credential-free same-host WebView fetch", async () => {
  const original = globalThis.fetch;
  const urls = [];
  globalThis.__pmcnRequest = async () => {
    throw Error("native TLS failure");
  };
  globalThis.fetch = async (url, options) => {
    urls.push(url);
    assert.equal(options.credentials, "omit");
    assert.equal(options.redirect, "error");
    assert.ok(options.signal);
    return { status: 200, text: async () => '{"releases":[]}' };
  };
  try {
    assert.deepEqual(
      await new Network().json(
        "https://user.wujiesync.cc/download/alpha/releases.json",
      ),
      { releases: [] },
    );
    assert.deepEqual(urls, [
      "https://user.wujiesync.cc/download/alpha/releases.json",
    ]);
  } finally {
    globalThis.fetch = original;
  }
});

test("Global native transport failure falls back for official feed and release files only", async () => {
  const original = globalThis.fetch;
  const requests = [];
  globalThis.__pmcnRequest = async () => {
    throw Error("synthetic iPad native transport failure");
  };
  globalThis.fetch = async (url, options) => {
    requests.push(url);
    assert.equal(options.credentials, "omit");
    assert.equal(options.redirect, "error");
    assert.equal(options.referrerPolicy, "no-referrer");
    assert.equal(options.cache, "no-store");
    assert.ok(options.signal);
    return { status: 200, text: async () => '{"releases":[]}' };
  };
  try {
    for (const path of [
      "releases.json",
      "alpha/1.1.5-alpha.4/manifest.json",
      "stable/1.1.5/main.js",
      "stable/1.1.5/styles.css",
    ]) {
      const url = "https://smartsync.cc/download/" + path;
      assert.deepEqual(await new Network().json(url), { releases: [] });
    }
    assert.equal(requests.length, 4);
    for (const url of [
      "https://smartsync.cc/auth/login",
      "https://smartsync.cc/download-foreign/releases.json",
      "https://pay.smartsync.cc/download/releases.json",
      "https://staging-pay.smartsync.cc/download/releases.json",
      "https://smartsync.cc.evil.test/download/releases.json",
      "https://smartsync.cc:8443/download/releases.json",
      "https://user:pass@smartsync.cc/download/releases.json",
      "https://github.com/owner/repo/releases/download/1.0.0/manifest.json",
    ]) await assert.rejects(new Network().get(url), /native transport failure/);
    assert.equal(requests.length, 4, "no account, foreign or proxy fallback");
  } finally {
    globalThis.fetch = original;
  }
});

test("Global fallback preserves native HTTP/JSON failures and reports both transport errors", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw Error("synthetic WebView blocked"); };
  const url = "https://smartsync.cc/download/releases.json";
  try {
    for (const response of [
      { status: 503, text: "unavailable" },
      { status: 200, text: "invalid JSON" },
    ]) {
      globalThis.__pmcnRequest = async () => response;
      await assert.rejects(new Network().json(url));
    }
    assert.equal(calls, 0);
    globalThis.__pmcnRequest = async () => { throw Error("synthetic native blocked"); };
    await assert.rejects(new Network().json(url), error =>
      /原生请求：.*native blocked/.test(error.message) && /浏览器请求：.*WebView blocked/.test(error.message));
    assert.equal(calls, 1);
    globalThis.fetch = async () => ({status: 503, text: async () => "unavailable"});
    await assert.rejects(new Network().json(url), /HTTP 503/);
    globalThis.fetch = async () => ({status: 200, text: async () => "invalid JSON"});
    await assert.rejects(new Network().json(url), /SyntaxError/);
  } finally { globalThis.fetch = original; }
});

test("fallback does not bypass HTTP or JSON failures and never targets the legacy host", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => {
    assert.fail("unexpected fallback");
  };
  try {
    for (const response of [
      { status: 503, text: "unavailable" },
      { status: 200, text: "invalid JSON" },
    ]) {
      globalThis.__pmcnRequest = async () => response;
      await assert.rejects(
        new Network().json(
          "https://user.wujiesync.cc/download/alpha/releases.json",
        ),
      );
    }
    globalThis.__pmcnRequest = async () => {
      throw Error("offline");
    };
    await assert.rejects(
      new Network().get(
        "https://sync.wujiesync.cc/download/alpha/releases.json",
      ),
      /offline/,
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("unchanged version skips manifest; repeated lookup uses cache", async () => {
  const requests = [];
  globalThis.__pmcnRequest = async ({ url }) => {
    requests.push(url);
    return {
      status: 200,
      text: JSON.stringify({
        tag_name: "1.0.0",
        prerelease: false,
        draft: false,
      }),
    };
  };
  const network = new Network(),
    current = { id: "demo", version: "1.0.0" };
  assert.equal(await network.latest("author/demo", current), current);
  assert.ok(requests.every((url) => url.endsWith("/releases/latest")));
  const count = requests.length;
  await network.latest("author/demo", current);
  assert.equal(requests.length, count);
});
test("concurrent identical lookups share a request and failed source does not block success", async () => {
  let calls = 0;
  globalThis.__pmcnRequest = async ({ url }) => {
    calls++;
    if (!url.startsWith("https://ghfast.top/")) throw Error("unavailable");
    return {
      status: 200,
      text: JSON.stringify({
        tag_name: "1.0.0",
        prerelease: false,
        draft: false,
      }),
    };
  };
  const network = new Network(),
    current = { id: "demo", version: "1.0.0" };
  const result = await Promise.all([
    network.latest("author/demo", current),
    network.latest("author/demo", current),
  ]);
  assert.equal(calls, 3);
  assert.deepEqual(result, [current, current]);
});
