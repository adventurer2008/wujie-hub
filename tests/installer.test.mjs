import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
await mkdir("test-output", { recursive: true });
await build({
  entryPoints: ["src/installer.ts"],
  outfile: "test-output/installer.mjs",
  bundle: true,
  format: "esm",
  platform: "node",
  alias: { obsidian: "./tests/obsidian-stub.ts" },
});
const { Installer } = await import("../test-output/installer.mjs");
function setup() {
  const files = new Map([
    [".obsidian/plugins/demo/data.json", '{"identity":"keep-me"}'],
  ]);
  let fail = false;
  const adapter = {
    exists: async (p) => files.has(p),
    read: async (p) => files.get(p),
    write: async (p, v) => {
      if (fail && p.endsWith("/main.js")) {
        fail = false;
        throw Error("disk failure");
      }
      files.set(p, v);
    },
    remove: async (p) => files.delete(p),
    mkdir: async (p) => files.set(p, ""),
  };
  const plugins = {
    manifests: {},
    plugins: {},
    enabledPlugins: new Set(),
    loadManifests: async () => {},
    unloadPlugin: async (id) => {
      delete plugins.plugins[id];
    },
    enablePluginAndSave: async (id) => {
      plugins.enabledPlugins.add(id);
      plugins.plugins[id] = {};
    },
    disablePluginAndSave: async (id) => {
      plugins.enabledPlugins.delete(id);
      delete plugins.plugins[id];
    },
  };
  return {
    files,
    plugins,
    installer: new Installer(
      { vault: { adapter, configDir: ".obsidian" }, plugins },
      "wujie-hub",
    ),
    fail: () => (fail = true),
  };
}
const bundle = (v) => ({
  "manifest.json": JSON.stringify({
    id: "demo",
    version: v,
    minAppVersion: "1.7.2",
  }),
  "main.js": "code " + v,
  "styles.css": null,
});

test("Global install preserves both regional identities and all non-release files", async () => {
  const s = setup();
  const cn = ".obsidian/plugins/wujie-sync/";
  const global = ".obsidian/plugins/smart-sync-global/";
  s.files.set(cn + "data.json", "domestic identity");
  s.files.set(cn + "main.js", "domestic code");
  s.files.set(global + "data.json", "overseas identity");
  s.files.set(global + "private.json", "keep");
  const release = {
    ...bundle("1.1.4"),
    "manifest.json": JSON.stringify({
      id: "smart-sync-global",
      version: "1.1.4",
      minAppVersion: "1.12.7",
    }),
  };
  await s.installer.install("smart-sync-global", release, "1.1.4");
  assert.equal(s.files.get(cn + "main.js"), "domestic code");
  assert.equal(s.files.get(cn + "data.json"), "domestic identity");
  assert.equal(s.files.get(global + "data.json"), "overseas identity");
  assert.equal(s.files.get(global + "private.json"), "keep");
  assert.equal(s.plugins.enabledPlugins.has("smart-sync-global"), false);
});
test("install and update preserve user identity and disabled state", async () => {
  const s = setup();
  await s.installer.install("demo", bundle("1.0.0"));
  assert.equal(
    s.files.get(".obsidian/plugins/demo/data.json"),
    '{"identity":"keep-me"}',
  );
  assert.equal(s.plugins.enabledPlugins.has("demo"), false);
});
test("write failure restores original files and enabled state", async () => {
  const s = setup();
  await s.installer.install("demo", bundle("1.0.0"));
  s.plugins.enabledPlugins.add("demo");
  s.plugins.plugins.demo = {};
  s.fail();
  await assert.rejects(
    s.installer.install("demo", bundle("2.0.0")),
    /原发行文件已恢复/,
  );
  assert.equal(s.files.get(".obsidian/plugins/demo/main.js"), "code 1.0.0");
  assert.ok(s.plugins.plugins.demo);
});
test("self protection and identity mismatch reject before writes", async () => {
  const s = setup();
  await assert.rejects(
    s.installer.install("wujie-hub", bundle("1.0.0")),
    /自身/,
  );
  await assert.rejects(s.installer.install("other", bundle("1.0.0")), /不匹配/);
  assert.equal(s.files.size, 1);
});
test("uninstall preserves configuration and makes a backup", async () => {
  const s = setup();
  await s.installer.install("demo", bundle("1.0.0"));
  await s.installer.uninstall("demo");
  assert.ok(s.files.has(".obsidian/plugins/demo/data.json"));
  assert.equal(s.files.has(".obsidian/plugins/demo/main.js"), false);
  assert.ok([...s.files.keys()].some((p) => p.includes("-uninstall-")));
});
test("concurrent mutation is rejected", async () => {
  const s = setup();
  let finish;
  const active = s.installer.run(() => new Promise((r) => (finish = r)));
  await assert.rejects(s.installer.uninstall("demo"), /已有操作/);
  finish();
  await active;
});

test("mobile rejects desktop-only packages before any backup, unload or write", async () => {
  const s = setup();
  const before = new Map(s.files);
  const desktop = bundle("1.0.0");
  desktop["manifest.json"] = JSON.stringify({
    ...JSON.parse(desktop["manifest.json"]),
    isDesktopOnly: true,
  });
  globalThis.__pmcnMobile = true;
  try {
    await assert.rejects(s.installer.install("demo", desktop), /仅支持桌面端/);
    assert.deepEqual(s.files, before);
    await s.installer.install("demo", bundle("1.0.0"));
    assert.equal(
      s.files.get(".obsidian/plugins/demo/data.json"),
      '{"identity":"keep-me"}',
    );
  } finally {
    delete globalThis.__pmcnMobile;
  }
});

test("unknown platform plugin manager state stops before touching files", async () => {
  const s = setup();
  s.plugins.enabledPlugins = [];
  await assert.rejects(
    s.installer.install("demo", bundle("1.0.0")),
    /接口不兼容/,
  );
  assert.equal(s.files.size, 1);
});

test("both manager identities are protected during ID migration", async () => {
  const s = setup();
  for (const id of ["wujie-hub", "plugin-manager-cn"]) {
    await assert.rejects(
      s.installer.install(id, bundle("1.0.0")),
      /管理器自身/,
    );
    await assert.rejects(s.installer.uninstall(id), /管理器自身/);
  }
  assert.equal(s.files.size, 1);
});

test("a running legacy manager blocks new-manager mutations without unloading it", async () => {
  const s = setup();
  const legacy = {};
  s.plugins.plugins["plugin-manager-cn"] = legacy;
  await assert.rejects(
    s.installer.install("demo", bundle("1.0.0")),
    /停用旧版管理器/,
  );
  assert.equal(s.files.size, 1);
  assert.equal(s.plugins.plugins["plugin-manager-cn"], legacy);
});
