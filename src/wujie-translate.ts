import { FILES, Bundle } from "./core";
import { record } from "./json";
import { Network } from "./network";
import { verifyBundle } from "./wujie";

export const TRANSLATE_ID = "wujie-translate";
const origin = "https://user.wujiesync.cc";
const download = origin + "/download/translate/";

export async function loadTranslateRelease(net: Network, channel: "Stable" | "Alpha") {
  const directory = download + channel.toLowerCase() + "/";
  const versionPattern = channel === "Stable" ? /^\d+\.\d+\.\d+$/ : /^\d+\.\d+\.\d+-alpha\.[1-9]\d*$/;
  const feed = record(await net.json<unknown>(directory + "releases.json"));
  if (feed.schemaVersion !== 1 || feed.pluginId !== TRANSLATE_ID ||
      feed.channel !== channel || typeof feed.latest !== "string" ||
      !versionPattern.test(feed.latest) ||
      !Array.isArray(feed.releases))
    throw Error("无界译 Alpha 版本清单格式错误");
  const matches = feed.releases.map(record).filter(row => row.version === feed.latest);
  const release = matches[0];
  const base = directory + feed.latest + "/";
  if (matches.length !== 1 || release.id !== TRANSLATE_ID ||
      release.channel !== channel || release.baseUrl !== base)
    throw Error("无界译 Alpha 版本来源错误");
  const sha256: Record<string, string> = {};
  for (const file of FILES) {
    const digest = record(release.sha256)[file];
    if (typeof digest !== "string" || !/^[a-f0-9]{64}$/.test(digest))
      throw Error("无界译 Alpha 缺少文件摘要：" + file);
    sha256[file] = digest;
  }
  return { version: feed.latest, base, sha256 };
}

export const loadTranslateAlpha = (net: Network) => loadTranslateRelease(net, "Alpha");

export async function downloadTranslateRelease(net: Network, release: Awaited<ReturnType<typeof loadTranslateRelease>>) {
  const bundle: Bundle = {};
  for (const file of FILES) bundle[file] = await net.get(release.base + file);
  await verifyBundle(bundle, release.sha256);
  const manifest = record(JSON.parse(bundle["manifest.json"] || "null"));
  if (manifest.id !== TRANSLATE_ID || manifest.version !== release.version)
    throw Error("无界译 Alpha 安装包与版本清单不匹配");
  return bundle;
}
export const downloadTranslateAlpha = downloadTranslateRelease;
