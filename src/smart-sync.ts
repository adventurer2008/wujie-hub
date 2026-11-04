import { Network } from "./network";
import { Bundle, FILES } from "./core";
import { record } from "./json";
import { verifyBundle } from "./wujie";

export const SMART_SYNC_ID = "smart-sync-global";
export const SMART_SYNC_ALPHA_FEED =
  "https://smartsync.cc/download/alpha/releases.json";
export const SMART_SYNC_ALPHA = Object.freeze({
  version: "1.1.4",
  baseUrl:
    "https://github.com/adventurer2008/obsidian-smart-sync-release-global/releases/download/1.1.4/",
  sha256: Object.freeze({
    "main.js":
      "1d39be46a0224005a1c8e95b45e686c3837e171935b0490bc3dcdb38896adaa6",
    "manifest.json":
      "926cb2b550156edd54eba4f6f84f155d5d8828a342ecf85bc92feb2c3127e058",
    "styles.css":
      "5c79e29c861f843d51d6de41d3c740d93905131c6495e4754777ac7cfa725b0b",
  }),
});

export async function checkSmartSyncAlpha(net: Network) {
  const feed = record(await net.json<unknown>(SMART_SYNC_ALPHA_FEED));
  if (feed.pluginId !== SMART_SYNC_ID || !Array.isArray(feed.releases))
    throw Error("Smart Sync 版本清单格式错误");
  const releases = feed.releases.map((entry: unknown) => record(entry));
  const release = releases.find(
    (entry) =>
      entry.version === SMART_SYNC_ALPHA.version && entry.channel === "Alpha",
  );
  const expected = record(release?.sha256);
  if (
    !release ||
    !Object.entries(SMART_SYNC_ALPHA.sha256).every(
      ([file, digest]) => expected[file] === digest,
    )
  )
    throw Error("Smart Sync 版本清单与已校验安装包不匹配，请更新 Hub 后重试");
  return releases.some((entry) => entry.version !== SMART_SYNC_ALPHA.version)
    ? "当前可安装 Alpha " +
        SMART_SYNC_ALPHA.version +
        "；下载站有其他版本，请更新 Hub 获取支持"
    : "Smart Sync Alpha 已是最新版本 " + SMART_SYNC_ALPHA.version;
}

export async function downloadSmartSync(net: Network): Promise<Bundle> {
  const bundle: Bundle = {};
  for (const file of FILES)
    bundle[file] = await net.get(SMART_SYNC_ALPHA.baseUrl + file);
  await verifyBundle(bundle, SMART_SYNC_ALPHA.sha256);
  const manifest = record(
    JSON.parse(bundle["manifest.json"] || "null") as unknown,
  );
  if (
    manifest.id !== SMART_SYNC_ID ||
    manifest.version !== SMART_SYNC_ALPHA.version
  )
    throw Error("Smart Sync 发行版本与安装包不匹配");
  return bundle;
}
