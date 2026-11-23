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
const globalRelease = {
  id: "smart-sync-global",
  version: "1.1.4",
  channel: "Alpha",
  baseUrl: "https://smartsync.cc/download/alpha/1.1.4/",
  sha256: {
    "main.js": "a".repeat(64),
    "manifest.json": "b".repeat(64),
    "styles.css": "c".repeat(64),
  },
};

function globalFixture() {
  const page = Object.create(Page.prototype);
  Object.assign(page, {
    pageVisible: true,
    smartSyncGeneration: 0,
    smartSyncReleases: [globalRelease],
    smartSyncSelected: "",
    smartSyncManualSelection: false,
    pm: {
      state: {},
      save: async () => {},
      net: {
        json: async () => ({
          pluginId: "smart-sync-global",
          releases: [globalRelease],
        }),
      },
    },
  });
  return page;
}

test("new stable feed defaults to highest stable without installation and preserves manual Alpha", async () => {
  const page = globalFixture();
  const stable = (version) => ({
    ...globalRelease,
    version,
    channel: "Stable",
    baseUrl: `https://smartsync.cc/download/stable/${version}/`,
  });
  page.pm.net.json = async () => ({
    pluginId: "smart-sync-global",
    releases: [globalRelease, stable("3.9.0"), stable("3.10.0")],
  });
  await page.refreshSmartSyncReleases();
  assert.equal(page.smartSyncSelected, "Stable:3.10.0");
  page.smartSyncSelected = "Alpha:1.1.4";
  page.smartSyncManualSelection = true;
  await page.refreshSmartSyncReleases();
  assert.equal(page.smartSyncSelected, "Alpha:1.1.4");
  page.pm.net.json = async () => ({
    pluginId: "smart-sync-global",
    releases: [stable("4.0.0")],
  });
  await page.refreshSmartSyncReleases();
  assert.equal(page.smartSyncSelected, "Stable:4.0.0");
  assert.equal(page.smartSyncManualSelection, false);
});

test("Global failed refresh keeps last valid cache and ignores late or hidden responses", async () => {
  const page = globalFixture();
  const original = page.smartSyncReleases;
  page.pm.net.json = async () => {
    throw Error("offline");
  };
  await page.refreshSmartSyncReleases();
  assert.equal(page.smartSyncReleases, original);
  assert.match(page.smartSyncWarning, /offline/);
  let complete;
  page.pm.net.json = () =>
    new Promise((resolve) => {
      complete = resolve;
    });
  const pending = page.refreshSmartSyncReleases();
  page.pageVisible = false;
  page.smartSyncGeneration++;
  complete({ pluginId: "smart-sync-global", releases: [] });
  await pending;
  assert.equal(page.smartSyncReleases, original);
  assert.equal(page.pm.state.smartSyncReleases, undefined);
});

test("Global manual refresh wins over a slower opening refresh and repaints", async () => {
  const page = globalFixture();
  let complete,
    repaint = 0;
  page.refreshSmartSyncView = () => repaint++;
  page.pm.net.json = () =>
    new Promise((resolve) => {
      complete = resolve;
    });
  const opening = page.refreshSmartSyncReleases();
  page.pm.net.json = async () => ({
    pluginId: "smart-sync-global",
    releases: [],
  });
  await page.refreshSmartSyncReleases();
  complete({ pluginId: "smart-sync-global", releases: [globalRelease] });
  await opening;
  assert.deepEqual(page.smartSyncReleases, []);
  assert.equal(repaint, 1);
});

test("both installed sync plugins appear once in separate cards, outside ordinary results", () => {
  const plugins = {
    manifests: {
      "wujie-sync": { id: "wujie-sync", name: "无界同步", version: "1.1.3" },
      "smart-sync-global": {
        id: "smart-sync-global",
        name: "Smart Sync",
        version: "1.1.4",
      },
    },
    plugins: {},
    enabledPlugins: new Set(),
    loadManifests() {},
    enablePluginAndSave() {},
    disablePluginAndSave() {},
    unloadPlugin() {},
  };
  const page = new Page({
    app: { plugins },
    manifest: { id: "wujie-hub", name: "Hub", version: "candidate" },
    state: {
      catalog: Object.values(plugins.manifests).map((value) => ({
        ...value,
        description: "Sync",
        repo: "example/plugin",
      })),
    },
    net: { json: () => new Promise(() => {}) },
  });
  page.query = "sync";
  const root = new TestElement();
  page.renderPage(root);
  const elements = [];
  const walk = (element) => {
    elements.push(element);
    element.children.forEach(walk);
  };
  walk(root);
  assert.equal(
    elements.filter((element) => element.text === "Smart Sync").length,
    1,
  );
  assert.equal(
    elements.filter((element) => element.text === "无界同步").length,
    1,
  );
  assert.equal(
    elements.filter((element) => element.classes.has("pmcn-sync-section"))
      .length,
    4,
  );
  assert.equal(
    elements.filter((element) => element.text === "已安装").length,
    0,
  );
});

test("1.12 opens each first-party update check once and places installation below the update row", () => {
  let alphaRequests = 0;
  const app = {
    plugins: {
      manifests: {
        "wujie-translate": { id: "wujie-translate", version: "0.1.1", author: "lihy" },
      },
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
    manifest: { id: "wujie-hub", name: "Wujie Hub", version: "0.1.22" },
    state: {
      catalog: [],
      smartSyncReleases: [globalRelease],
      wujieReleases: [{ ...globalRelease, id: "wujie-sync", channel: "Stable" }],
    },
    net: {
      json() {
        alphaRequests++;
        return new Promise(() => {});
      },
    },
  });
  page.translateReleases = {
    Stable: { version: "0.1.0" },
    Alpha: { version: "0.1.1-alpha.1" },
  };
  page.wordReleases = { Stable: { version: "1.0.1" }, Alpha: { version: "1.0.1-alpha.1" } };
  const root = new TestElement();
  page.renderPage(root);
  const texts = [];
  const walk = (el) => {
    texts.push(el.text);
    el.children.forEach(walk);
  };
  walk(root);
  assert.ok(texts.includes("已安装插件"));
  assert.ok(texts.includes("Wujie Hub v0.1.22"));
  assert.ok(texts.includes("无界同步"));
  assert.ok(texts.includes("Smart Sync"));
  assert.ok(texts.includes("无界译"));
  assert.ok(texts.includes("Smart Word"));
  assert.ok(texts.includes("1.0.1-alpha.1"));
  assert.equal(page.wordSelected, "Stable:1.0.1");
  assert.ok(!texts.includes("历史版本"));
  assert.ok(texts.includes("安装所选版本"));
  assert.ok(texts.includes("1.1.4"));
  assert.equal(texts.filter((text) => text === "检查更新").length, 5);
  assert.equal(texts.includes("安装 Alpha"), false);
  assert.equal(page.smartSyncSelected, "");
  assert.equal(
    texts.filter(
      (text) =>
        text ===
        "Sync notes, attachments and selected settings with compression and client-side encryption.",
    ).length,
    2,
  );
  assert.equal(alphaRequests, 7);
  const elements = [];
  const collect = el => { elements.push(el); el.children.forEach(collect); };
  collect(root);
  const cards = elements.filter(el => el.classes.has("pmcn-sync-section"));
  const syncDescription = "Sync notes, attachments and selected settings with compression and client-side encryption.";
  const translationDescription = "Translate selected text and look up English words with hosted bilingual dictionaries.";
  for (const [index, [name, metadata, description]] of [
    ["无界同步", " · 未安装 作者：lihy", syncDescription],
    ["Smart Word", " · 未安装 作者：lihy", "编辑 .docx 文档，插入图片并设置打开密码。安装后在 Obsidian 社区插件设置中启用。"],
    ["无界译", " v0.1.1 作者：lihy", translationDescription],
    ["Smart Sync", " · 未安装 作者：lihy", syncDescription],
  ].entries()) {
    const [title, desc, actions] = cards[index].children[0].children;
    assert.ok(title.children.some(el => el.classes.has("pmcn-plugin-name") && el.text === name));
    assert.ok(title.children.some(el => el.classes.has("pmcn-plugin-meta") && el.text === metadata));
    assert.equal(desc.text, description);
    assert.equal(actions.children[0].text, "检查更新");
    const picker = actions.children[1];
    assert.ok(picker.classes.has("pmcn-release-picker"));
    const controls = picker.children.at(-1).children;
    assert.ok(controls.some(el => el.attributes.get("aria-label") === name + " 版本"));
    assert.equal(controls.filter(el => el.text === "安装所选版本").length, 1);
  }
  assert.equal(page.translateSelected, "Stable:0.1.0");
  assert.ok(texts.includes("0.1.1-alpha.1"));
  page.translateSelected = "Alpha:0.1.1-alpha.1";
  page.refreshTranslateView();
  assert.equal(page.translateSelected, "Alpha:0.1.1-alpha.1");
  page.translateReleases.Alpha.version = "0.1.1-alpha.2";
  page.refreshTranslateView();
  assert.equal(page.translateSelected, "Stable:0.1.0");
  delete app.plugins.manifests["wujie-translate"];
  page.translateReleases = {};
  page.refreshTranslateView();
  const [title, desc] = cards[2].children[0].children;
  assert.ok(title.children.some(el => el.text === " · 未安装 作者：lihy"));
  assert.equal(desc.text, translationDescription);
  app.plugins.manifests["smart-word"] = { id: "smart-word", version: "1.0.0", author: "lihy" };
  page.refreshWordView();
  assert.ok(cards[1].children[0].children[0].children.some(el => el.text === " v1.0.0 作者：lihy"));
  page.renderPage(root);
  assert.equal(alphaRequests, 7);
});

test("Smart Sync Alpha requires explicit consent before any download or installation", async () => {
  const page = Object.create(Page.prototype);
  let prompt;
  page.pm = {
    confirm: async (text) => {
      prompt = text;
      return false;
    },
    net: {
      get: () => {
        throw Error("unexpected download");
      },
    },
    installer: {
      install: () => {
        throw Error("unexpected install");
      },
    },
  };
  await page.installSmartSync(globalRelease);
  assert.match(prompt, /Alpha/);
  assert.match(prompt, /隔离测试库/);
  assert.match(prompt, /海外账号与国内版独立/);
});

test("generic community installation cannot bypass the Global Alpha channel", async () => {
  const page = Object.create(Page.prototype);
  page.pm = { manifest: { id: "wujie-hub" } };
  await assert.rejects(
    page.installCommunity({ id: "smart-sync-global" }),
    /专属管理/,
  );
});

test("Alpha download failure leaves installer and domestic rollback state untouched", async () => {
  const page = Object.create(Page.prototype);
  const state = {
    verified: { "main.js": "domestic" },
    installedWujieTag: "1.1.3",
  };
  const before = structuredClone(state);
  page.pm = {
    state,
    confirm: async () => true,
    net: {
      get: async () => {
        throw Error("offline");
      },
    },
    installer: {
      install: () => {
        throw Error("unexpected install");
      },
    },
  };
  await assert.rejects(page.installSmartSync(globalRelease), /offline/);
  assert.deepEqual(state, before);
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

test("successful operations clear inline status instead of leaving a completion row", async () => {
  const page = Object.create(Page.prototype);
  page.pm = { save: async () => {} };
  page.update = () => {};
  await page.task(async () => {});
  assert.equal(page.status, "");
  assert.equal(page.working, false);
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
  assert.equal(p.selected, "1.1.1");
  assert.deepEqual(counts(), { saves: 1, renders: 1 });
});

test("Alpha failure retains cached releases and exposes its actual error", async () => {
  const { p, counts } = fixture();
  p.pm.net.json = async () => {
    throw Error("native TLS failure; Failed to fetch");
  };
  await p.refreshAlphaOnOpen(1);
  assert.match(p.alphaSourceWarning, /native TLS failure/);
  assert.match(p.alphaSourceWarning, /当前显示上次记录/);
  assert.equal(p.releases[0].version, "1.1.2-alpha.1");
  assert.equal(counts().renders, 1);
  p.releases = [];
  await p.refreshAlphaOnOpen(1);
  assert.match(p.alphaSourceWarning, /暂无本机 Alpha 缓存/);
});

test("cache write failure is not reported as a failed Alpha download", async () => {
  const { p, counts } = fixture();
  p.pm.save = async () => {
    throw Error("disk write denied");
  };
  await p.refreshAlphaOnOpen(1);
  assert.equal(p.releases[0].version, "1.1.2-alpha.2");
  assert.match(
    p.alphaSourceWarning,
    /Alpha 已刷新.*缓存保存失败.*disk write denied/,
  );
  assert.equal(counts().renders, 1);
});
test("late auto response cannot overwrite a newer refresh or a hidden page", async () => {
  const { p } = fixture();
  let finish;
  let requests = 0;
  p.pm.net.json = () =>
    ++requests === 1
      ? new Promise((r) => (finish = r))
      : Promise.reject(Error("Legacy fallback unavailable"));
  const request = p.refreshAlphaOnOpen(1);
  p.openGeneration++;
  finish({ releases: [] });
  await request;
  assert.equal(p.selected, "1.1.2-alpha.1");
});
test("manual refresh repaints both channels on declarative hosts without reopening", async () => {
  const { p, entry, counts } = fixture();
  p.update = () => {}; // Host refresh does not invoke the custom renderer.
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
  await p.task(() => p.refreshWujieAll());
  assert.equal(calls.length, 2);
  assert.deepEqual(
    p.releases.map((r) => r.version),
    ["1.1.2-alpha.2", "1.1.2"],
  );
  assert.equal(p.openGeneration, 2);
  assert.equal(p.working, false);
  assert.equal(counts().renders, 1);
  assert.equal(p.selected, "1.1.2");
});

test("manual refresh preserves a still-visible selection and ignores responses after hiding", async () => {
  const { p, entry } = fixture();
  p.selected = entry.version;
  p.manualSelection = true;
  p.pm.net.json = async () => ({
    releases: [entry, { ...entry, version: "1.1.1", channel: "Stable" }],
  });
  await p.refreshWujieAll();
  assert.equal(p.selected, entry.version);
  const old = p.releases;
  let complete;
  const response = new Promise((resolve) => {
    complete = resolve;
  });
  p.pm.net.json = () => response;
  const pending = p.refreshWujieAll();
  p.pageVisible = false;
  p.openGeneration++;
  complete({ releases: [entry] });
  await pending;
  assert.equal(p.releases, old);
});
