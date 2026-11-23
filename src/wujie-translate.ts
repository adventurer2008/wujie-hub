import { FILES, Bundle } from "./core";
import { record } from "./json";
import { Network } from "./network";
import { verifyBundle } from "./wujie";

export const TRANSLATE_ID = "wujie-translate";
export const WORD_ID = "smart-word";
const origin = "https://user.wujiesync.cc";
const products = {
  [TRANSLATE_ID]: { path: "translate", name: "无界译" },
  [WORD_ID]: { path: "smart-word", name: "Smart Word" },
};
type Product = keyof typeof products;

async function loadRelease(net: Network, id: Product, channel: "Stable" | "Alpha") {
  const { path, name } = products[id];
  const directory = origin + "/download/" + path + "/" + channel.toLowerCase() + "/";
  const versionPattern = channel === "Stable" ? /^\d+\.\d+\.\d+$/ : /^\d+\.\d+\.\d+-alpha\.[1-9]\d*$/;
  const feed = record(await net.json<unknown>(directory + "releases.json"));
  if (feed.schemaVersion !== 1 || feed.pluginId !== id ||
      feed.channel !== channel || typeof feed.latest !== "string" ||
      !versionPattern.test(feed.latest) ||
      !Array.isArray(feed.releases))
    throw Error(`${name} ${channel} 版本清单格式错误`);
  const matches = feed.releases.map(record).filter(row => row.version === feed.latest);
  const release = matches[0];
  const base = directory + feed.latest + "/";
  if (matches.length !== 1 || release.id !== id ||
      release.channel !== channel || release.baseUrl !== base)
    throw Error(`${name} ${channel} 版本来源错误`);
  const sha256: Record<string, string> = {};
  for (const file of FILES) {
    const digest = record(release.sha256)[file];
    if (typeof digest !== "string" || !/^[a-f0-9]{64}$/.test(digest))
      throw Error(`${name} ${channel} 缺少文件摘要：${file}`);
    sha256[file] = digest;
  }
  return { version: feed.latest, base, sha256 };
}

export const loadTranslateRelease = (net: Network, channel: "Stable" | "Alpha") => loadRelease(net, TRANSLATE_ID, channel);
export const loadTranslateAlpha = (net: Network) => loadTranslateRelease(net, "Alpha");
export const loadWordRelease = (net: Network, channel: "Stable" | "Alpha" = "Stable") => loadRelease(net, WORD_ID, channel);

async function downloadRelease(net: Network, id: Product, release: Awaited<ReturnType<typeof loadRelease>>) {
  const bundle: Bundle = {};
  for (const file of FILES) bundle[file] = await net.get(release.base + file);
  await verifyBundle(bundle, release.sha256);
  const manifest = record(JSON.parse(bundle["manifest.json"] || "null"));
  if (manifest.id !== id || manifest.version !== release.version)
    throw Error(`${products[id].name}安装包与版本清单不匹配`);
  return bundle;
}
export const downloadTranslateRelease = (net: Network, release: Awaited<ReturnType<typeof loadRelease>>) => downloadRelease(net, TRANSLATE_ID, release);
export const downloadTranslateAlpha = downloadTranslateRelease;
export const downloadWordRelease = (net: Network, release: Awaited<ReturnType<typeof loadRelease>>) => downloadRelease(net, WORD_ID, release);
