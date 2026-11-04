import { Network } from "./network";
import { Bundle, FILES } from "./core";
import { record } from "./json";
import { verifyBundle } from "./wujie";

export const SMART_SYNC_ID = "smart-sync-global";
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
