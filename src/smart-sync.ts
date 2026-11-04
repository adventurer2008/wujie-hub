import { Network } from "./network";
import { Bundle, FILES } from "./core";
import { record } from "./json";
import { verifyBundle, WujieRelease } from "./wujie";

export const SMART_SYNC_ID = "smart-sync-global";
export const SMART_SYNC_FEED = "https://smartsync.cc/download/releases.json";
export const smartSyncReleaseKey = (release: WujieRelease) =>
  release.channel + ":" + release.version;

function assetUrl(value: string, release: WujieRelease, file?: string) {
  const url = new URL(value);
  const directory =
    "/download/" +
    release.channel.toLowerCase() +
    "/" +
    encodeURIComponent(release.version) +
    "/";
  if (
    url.origin !== "https://smartsync.cc" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== directory + (file || "")
  )
    throw Error("Smart Sync 安装文件地址不属于该版本的官方下载目录");
  return url.href;
}

export function parseSmartSyncFeed(value: unknown): WujieRelease[] {
  const feed = record(value);
  if (
    feed.pluginId !== SMART_SYNC_ID ||
    (feed.schemaVersion !== undefined && feed.schemaVersion !== 1) ||
    !Array.isArray(feed.releases) ||
    feed.releases.length > 1000
  )
    throw Error("Smart Sync 版本清单格式不受支持，保留上次记录");
  const keys = new Set<string>();
  return feed.releases.map((value: unknown) => {
    const entry = record(value);
    if (
      entry.id !== SMART_SYNC_ID ||
      typeof entry.version !== "string" ||
      !/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(entry.version) ||
      !["Stable", "Alpha"].includes(String(entry.channel)) ||
      (entry.channel === "Stable" && !/^\d+\.\d+\.\d+$/.test(entry.version))
    )
      throw Error("Smart Sync 清单包含无效插件、版本或渠道");
    const release: WujieRelease = {
      version: entry.version,
      channel: entry.channel as "Stable" | "Alpha",
      baseUrl: typeof entry.baseUrl === "string" ? entry.baseUrl : "",
      sha256: {},
      rollbackSafe: entry.rollbackSafe === true,
    };
    assetUrl(release.baseUrl, release);
    for (const file of FILES) {
      const digest = record(entry.sha256)[file];
      if (typeof digest !== "string" || !/^[a-f0-9]{64}$/i.test(digest))
        throw Error("Smart Sync 清单缺少有效文件摘要：" + file);
      release.sha256[file] = digest.toLowerCase();
    }
    if (entry.publishedAt !== undefined) {
      if (
        typeof entry.publishedAt !== "string" ||
        !Number.isFinite(Date.parse(entry.publishedAt))
      )
        throw Error("Smart Sync 清单发布时间无效");
      release.publishedAt = entry.publishedAt;
    }
    const key = smartSyncReleaseKey(release);
    if (keys.has(key)) throw Error("Smart Sync 清单包含重复版本");
    keys.add(key);
    return release;
  });
}

export async function loadSmartSyncReleases(net: Network) {
  return parseSmartSyncFeed(await net.json<unknown>(SMART_SYNC_FEED));
}

export async function downloadSmartSync(
  net: Network,
  release: WujieRelease,
): Promise<Bundle> {
  const [checked] = parseSmartSyncFeed({
    pluginId: SMART_SYNC_ID,
    releases: [{ ...release, id: SMART_SYNC_ID }],
  });
  const bundle: Bundle = {};
  for (const file of FILES)
    bundle[file] = await net.get(
      assetUrl(new URL(file, checked.baseUrl).href, checked, file),
    );
  await verifyBundle(bundle, checked.sha256);
  const manifest = record(
    JSON.parse(bundle["manifest.json"] || "null") as unknown,
  );
  if (manifest.id !== SMART_SYNC_ID || manifest.version !== checked.version)
    throw Error("Smart Sync 发行版本与安装包不匹配");
  return bundle;
}
