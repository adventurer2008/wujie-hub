import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const directory = "test-output/layout-preview";
await mkdir(directory, { recursive: true });
const feeds = {};
for (const path of ["releases.json", "alpha/releases.json"])
  feeds[path] = await (
    await fetch("https://user.wujiesync.cc/download/" + path)
  ).json();
feeds.global = await (
  await fetch("https://smartsync.cc/download/releases.json")
).json();
const manifests = {
  "wujie-sync": JSON.parse(
    await readFile(
      "E:/Data/test3/.obsidian/plugins/wujie-sync/manifest.json",
      "utf8",
    ),
  ),
  "smart-sync-global": await (
    await fetch("https://smartsync.cc/download/alpha/1.1.4/manifest.json")
  ).json(),
};
await build({
  stdin: {
    contents: `import { Page } from "./src/main";
const feeds = ${JSON.stringify(feeds)};
const app = {plugins:{manifests:${JSON.stringify(manifests)},plugins:{},enabledPlugins:new Set(),loadManifests:async()=>{},enablePluginAndSave:async()=>{},disablePluginAndSave:async()=>{},unloadPlugin:async()=>{}}};
const page = new Page({app,manifest:{id:"wujie-hub",name:"Wujie Hub",version:"next · UI candidate"},state:{catalog:[]},net:{json:async(url)=>url.startsWith("https://smartsync.cc/")?feeds.global:feeds[url.includes("/alpha/")?"alpha/releases.json":"releases.json"]},save:async()=>{},confirm:async()=>false});
page.renderPage(document.getElementById("settings"));
await page.refreshWujieAll(false); page.refreshWujieView();
await page.refreshSmartSyncReleases();`,
    resolveDir: process.cwd(),
  },
  outfile: directory + "/preview.js",
  bundle: true,
  format: "esm",
  external: ["electron"],
  alias: { obsidian: "./tests/preview-obsidian.ts" },
  plugins: [
    {
      name: "expose-page",
      setup(builder) {
        builder.onLoad({ filter: /src[\\/]main\.ts$/ }, async (args) => ({
          contents: (await readFile(args.path, "utf8")).replace(
            "class Page extends",
            "export class Page extends",
          ),
          loader: "ts",
        }));
      },
    },
  ],
});
await writeFile(directory + "/hub.css", await readFile("styles.css"));
await writeFile(
  directory + "/index.html",
  `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hub settings layout preview</title><link rel="stylesheet" href="hub.css"><style>
:root{--font-ui-small:13px;--font-semibold:600;--text-muted:#aaa;--text-normal:#ddd;--background-secondary:#252525;--background-modifier-border:#444;--interactive-normal:#383838;--background-primary:#1e1e1e}*{box-sizing:border-box}body{margin:0;background:#171717;color:#ddd;font:14px/1.5 system-ui,sans-serif}.frame{max-width:1080px;margin:24px auto;background:#202020;border:1px solid #3c3c3c;border-radius:12px;overflow:hidden}.banner{padding:12px 24px;border-bottom:1px solid #383838;color:#aaa;font-size:12px}.layout{display:flex}aside{width:190px;padding:26px 18px;background:#252525;flex-shrink:0}aside div{padding:7px 12px}aside .active{background:#45345f;border-radius:6px;color:#d9c6ff}main{padding:20px 30px;flex:1;min-width:0}.setting-item{display:flex;align-items:center;gap:18px;padding:16px 0;border-bottom:1px solid #333}.setting-item-info{flex:1;min-width:0}.setting-item-name{font-weight:500}.setting-item-description{font-size:13px;color:#aaa;margin-top:5px;line-height:1.6}.setting-item-control{display:flex;align-items:center;gap:8px}button,select,input{font:inherit;color:#ddd;background:#383838;border:1px solid #494949;border-radius:6px;padding:6px 12px;min-height:32px}button{white-space:nowrap}input{max-width:100%}.extra-setting-button{font-size:22px;background:transparent;border:0;padding:0 8px}.setting-heading .setting-item-name{font-size:19px}h2{font-size:19px;margin-top:0}@media(max-width:650px){aside{display:none}main{padding:16px}.frame{margin:0;border-radius:0}.setting-item{flex-wrap:wrap}.setting-item-control{flex-wrap:wrap}}
</style><div class="frame"><div class="banner">UI preview · Actual Hub settings renderer · No plugin installation or account access</div><div class="layout"><aside><div>设置</div><div>第三方插件</div><div class="active">Wujie Hub</div></aside><main id="settings"></main></div></div><script type="module" src="preview.js"></script></html>`,
);
console.log("Actual settings renderer preview ready at " + directory);
