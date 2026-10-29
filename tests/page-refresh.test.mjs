import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { readFile } from "node:fs/promises";
await build({
  entryPoints: ["src/main.ts"],
  outfile: "test-output/page.mjs",
  bundle: true,
  format: "esm",
  platform: "node",
  external: ["electron"],
  alias: { obsidian: "./tests/page-obsidian-stub.ts" },
  plugins: [
    {
      name: "expose-page-for-test",
      setup(builder) {
        builder.onLoad({ filter: /src[\\/]main\.ts$/ }, async (args) => ({
          contents:
            (await readFile(args.path, "utf8")).replace(
              "class Page extends",
              "export class Page extends",
            ) +
            '\nexport { TestElement } from "../tests/page-obsidian-stub";\n',
          loader: "ts",
        }));
      },
    },
  ],
});
const { Page, TestElement } = await import("../test-output/page.mjs");

test("1.12 page renders both update buttons and Wujie while network is unavailable", () => {
  let alphaRequests = 0;
  const app = {
    plugins: {
      manifests: {},
      plugins: {},
      enabledPlugins: new Set(),
      loadManifests() {},
      enablePluginAndSave() {},
      disablePluginAndSave() {},
      unloadPlugin() {},
    },
  };
  const page = new Page({
    app,
    manifest: { id: "wujie-hub", name: "Wujie Hub" },
    state: { catalog: [] },
    net: {
      json() {
        alphaRequests++;
        return new Promise(() => {});
      },
    },
  });
  const root = new TestElement();
  page.renderPage(root);
  const texts = [];
  const walk = (el) => {
    texts.push(el.text);
    el.children.forEach(walk);
  };
  walk(root);
  assert.ok(texts.includes("已安装插件"));
  assert.ok(texts.includes("无界同步"));
  assert.equal(texts.filter((text) => text === "检查更新").length, 2);
  assert.equal(alphaRequests, 1);
});

test("Obsidian 1.12 renders and refreshes without invoking the 1.13 API", async () => {
  const page = Object.create(Page.prototype);
  let renders = 0;
  page.renderLegacy = () => renders++;
  page.update = () => {
    throw Error("1.13 API called on 1.12");
  };
  page.pm = { save: async () => {} };
  globalThis.__pmcnLegacy = true;
  try {
    page.display();
    await page.task(async () => {});
    assert.equal(renders, 3);
    assert.equal(page.working, false);
  } finally {
    delete globalThis.__pmcnLegacy;
  }
});
test("declarative settings expose search terms and render the manager in one container", () => {
  const page = Object.create(Page.prototype);
  page.pm = { manifest: { name: "Wujie Hub" } };
  let rendered;
  page.renderPage = (el) => {
    rendered = el;
  };
  const [definition] = page.getSettingDefinitions();
  assert.ok(definition.aliases.includes("回退"));
  const root = { empty() {}, addClass() {} };
  definition.render({ settingEl: root });
  assert.equal(rendered, root);
});
test("failed operations refresh through the settings API and release the UI lock", async () => {
  const page = Object.create(Page.prototype);
  let refreshes = 0;
  page.update = () => refreshes++;
  page.pm = { save: async () => {} };
  await page.task(async () => {
    throw Error("failed installation");
  });
  assert.equal(page.working, false);
  assert.match(page.status, /failed installation/);
  assert.equal(refreshes, 2);
});
function fixture() {
  const p = Object.create(Page.prototype);
  let saves = 0,
    renders = 0;
  const sha256 = { "main.js": "a".repeat(64), "manifest.json": "b".repeat(64) };
  const entry = {
    id: "wujie-sync",
    version: "1.1.2-alpha.2",
    channel: "Alpha",
    baseUrl: "https://example.test/",
    sha256,
  };
  Object.assign(p, {
    pageVisible: true,
    openGeneration: 1,
    working: false,
    selected: "1.1.2-alpha.1",
    releases: [
      { version: "1.1.2-alpha.1", channel: "Alpha" },
      { version: "1.1.1", channel: "Stable" },
    ],
    refreshWujieView: () => renders++,
    pm: {
      state: {},
      net: {
        json: async () => ({ releases: [entry] }),
        fastJson: () => {
          throw Error("GitHub must not be queried on open");
        },
      },
      save: async () => saves++,
    },
  });
  return { p, entry, counts: () => ({ saves, renders }) };
}
test("opening refreshes site Alpha without GitHub and keeps stable choices", async () => {
  const { p, counts } = fixture();
  await p.refreshAlphaOnOpen(1);
  assert.deepEqual(
    p.releases.map((r) => r.version),
    ["1.1.2-alpha.2", "1.1.1"],
  );
  assert.equal(p.selected, "1.1.2-alpha.2");
  assert.deepEqual(counts(), { saves: 1, renders: 1 });
});
test("late auto response cannot overwrite a newer refresh or a hidden page", async () => {
  const { p } = fixture();
  let finish;
  let requests = 0;
  p.pm.net.json = () => ++requests === 1
    ? new Promise((r) => (finish = r))
    : Promise.reject(Error("Legacy fallback unavailable"));
  const request = p.refreshAlphaOnOpen(1);
  p.openGeneration++;
  finish({ releases: [] });
  await request;
  assert.equal(p.selected, "1.1.2-alpha.1");
});
test("manual refresh updates both channels", async () => {
  const { p, entry } = fixture();
  p.pm.state.feedUrl = "https://example.test/stable.json";
  let calls = [];
  p.pm.net.json = async (url) => {
    calls.push(url);
    return {
      releases: url.includes("stable.json")
        ? [
            {
              version: "1.1.2",
              channel: "Stable",
              baseUrl: "https://user.wujiesync.cc/download/stable/1.1.2/",
              sha256: entry.sha256,
            },
          ]
        : [entry],
    };
  };
  await p.refreshWujieAll();
  assert.equal(calls.length, 2);
  assert.deepEqual(
    p.releases.map((r) => r.version),
    ["1.1.2-alpha.2", "1.1.2"],
  );
  assert.equal(p.openGeneration, 2);
});
