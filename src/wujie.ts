import historyCache from "./wujie-history.json";
import { Bundle, FILES } from "./core";
import { Network } from "./network";
import { record } from "./json";
export const WUJIE_REPO = "adventurer2008/obsidian-smart-sync-release-cn";
export const WUJIE_DOWNLOAD_SITE = "https://user.wujiesync.cc/download/";
export const WUJIE_ALPHA_FEED = new URL(
  "alpha/releases.json",
  WUJIE_DOWNLOAD_SITE,
).href;
export interface WujieRelease {
  version: string;
  channel: "Alpha" | "Beta" | "Stable";
  baseUrl: string;
  sha256: Record<string, string>;
  rollbackSafe: boolean;
  publishedAt?: string;
  fromGithub?: boolean;
  fileUrls?: Record<string, string>;
}
export function recentReleases(releases: WujieRelease[]) {
  const sorted = [...releases].sort(
    (a, b) =>
      (Date.parse(b.publishedAt || "") || 0) -
      (Date.parse(a.publishedAt || "") || 0),
  );
  return [
    ...sorted.filter((r) => r.channel === "Alpha").slice(0, 3),
    ...sorted.filter((r) => r.channel === "Stable").slice(0, 5),
  ];
}
export function parseSiteFeed(
  value: unknown,
  metadataUrl: string,
): WujieRelease[] {
  const feed = record(value);
  if (feed?.pluginId && feed.pluginId !== "wujie-sync")
    throw Error("Alpha清单插件ID不匹配");
  const entries = Array.isArray(feed?.releases)
    ? feed.releases
    : Array.isArray(feed?.versions)
      ? feed.versions
      : feed?.version
        ? [feed]
        : [];
  return entries.flatMap((value: unknown): WujieRelease[] => {
    const entry = record(value);
    const version = entry.version;
    if (
      typeof version !== "string" ||
      !/^\d+\.\d+\.\d+-[\w.-]+$/.test(version) ||
      (entry.id && entry.id !== "wujie-sync")
    )
      return [];
    const label =
      version + " " + (typeof entry.channel === "string" ? entry.channel : "");
    const channel = /alpha/i.test(label)
      ? "Alpha"
      : /beta/i.test(label)
        ? "Beta"
        : null;
    if (!channel) return [];
    const baseUrl = new URL(
      typeof entry.baseUrl === "string"
        ? entry.baseUrl
        : typeof entry.base_url === "string"
          ? entry.base_url
          : "./",
      metadataUrl,
    ).href;
    const sha256: Record<string, string> = {},
      fileUrls: Record<string, string> = {};
    for (const file of FILES) {
      const item = record(entry.files)[file];
      const fileItem = record(item);
      const digest =
        record(entry.sha256)[file] ||
        (typeof item === "string" ? item : fileItem.sha256);
      if (!digest) {
        if (file === "styles.css" && !item) continue;
        return [];
      }
      if (
        typeof digest !== "string" ||
        !/^(?:sha256:)?[a-f0-9]{64}$/i.test(digest)
      )
        return [];
      sha256[file] = digest.replace(/^sha256:/i, "").toLowerCase();
      const url = new URL(
        typeof fileItem.url === "string" ? fileItem.url : file,
        baseUrl,
      );
      if (url.protocol !== "https:") return [];
      fileUrls[file] = url.href;
    }
    const publishedAt =
      entry.publishedAt || entry.published_at || entry.releasedAt;
    return [
      {
        version,
        channel,
        baseUrl,
        sha256,
        fileUrls,
        rollbackSafe: entry.rollbackSafe === true,
        publishedAt: typeof publishedAt === "string" ? publishedAt : undefined,
      },
    ];
  });
}
export async function loadSiteAlpha(net: Network): Promise<WujieRelease[]> {
  const feed = await net.json<unknown>(WUJIE_ALPHA_FEED);
  const releases = parseSiteFeed(feed, WUJIE_ALPHA_FEED);
  if (!releases.length) throw Error("下载站尚无可识别的 Alpha 安装清单");
  return releases;
}
interface GithubRelease {
  tag_name: string;
  name?: string;
  draft: boolean;
  prerelease: boolean;
  published_at: string;
  assets: { name: string; digest?: string }[];
}
export function parseReleases(items: GithubRelease[]): WujieRelease[] {
  if (!Array.isArray(items)) throw Error("无界同步发行清单格式错误");
  return items
    .filter(
      (r) => !r.draft && /^(v)?\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(r.tag_name),
    )
    .flatMap((r): WujieRelease[] => {
      const sha256: Record<string, string> = {};
      for (const file of FILES) {
        const a = r.assets?.find((a) => a.name === file);
        if (!a) {
          if (file !== "styles.css") return [];
          continue;
        }
        if (!/^sha256:[a-f0-9]{64}$/i.test(a.digest || "")) return [];
        sha256[file] = a.digest!.slice(7).toLowerCase();
      }
      const label = r.tag_name + " " + (r.name || "");
      const channel = /\balpha\b/i.test(label)
        ? "Alpha"
        : /\bbeta\b/i.test(label) || r.prerelease
          ? "Beta"
          : "Stable";
      return [
        {
          version: r.tag_name,
          channel,
          baseUrl:
            "https://github.com/" +
            WUJIE_REPO +
            "/releases/download/" +
            encodeURIComponent(r.tag_name) +
            "/",
          sha256,
          rollbackSafe: false,
          publishedAt: r.published_at,
          fromGithub: true,
        },
      ];
    })
    .sort(
      (a, b) =>
        (Date.parse(b.publishedAt || "") || 0) -
        (Date.parse(a.publishedAt || "") || 0),
    );
}
export async function loadWujieReleases(
  net: Network,
  feedUrl?: string,
): Promise<WujieRelease[]> {
  if (feedUrl) {
    const feed = await net.json<{ releases: WujieRelease[] }>(feedUrl);
    if (!Array.isArray(feed.releases)) throw Error("版本清单格式错误");
    return feed.releases;
  }
  net.wujieHistoryCacheUsed = false;
  try {
    const all: GithubRelease[] = [];
    for (let page = 1; page <= 10; page++) {
      const rows = await net.fastJson<GithubRelease[]>(
        "https://api.github.com/repos/" +
          WUJIE_REPO +
          "/releases?per_page=100&page=" +
          page,
      );
      if (!Array.isArray(rows)) throw Error("版本清单格式错误");
      all.push(...rows);
      if (rows.length < 100) break;
    }
    return parseReleases(all);
  } catch {
    net.wujieHistoryCacheUsed = true;
    return historyCache.releases as WujieRelease[];
  }
}
export async function hashes(bundle: Bundle): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const file of FILES) {
    if (bundle[file] === null) continue;
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(bundle[file]),
    );
    result[file] = Array.from(new Uint8Array(digest), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
  }
  return result;
}
export async function verifyBundle(
  bundle: Bundle,
  expected: Record<string, string>,
) {
  const actual = await hashes(bundle);
  for (const file of FILES) {
    if (bundle[file] === null) {
      if (expected[file]) throw Error("缺少发行文件：" + file);
      continue;
    }
    if (
      !/^[a-f0-9]{64}$/i.test(expected[file] || "") ||
      actual[file] !== expected[file].toLowerCase()
    )
      throw Error("文件校验失败：" + file);
  }
}
export async function downloadWujie(
  net: Network,
  release: WujieRelease,
): Promise<Bundle> {
  const b: Bundle = {};
  for (const file of FILES) {
    if (file === "styles.css" && !release.sha256[file]) {
      b[file] = null;
      continue;
    }
    b[file] = await net.get(
      release.fileUrls?.[file] ||
        new URL(
          file,
          release.baseUrl.endsWith("/")
            ? release.baseUrl
            : release.baseUrl + "/",
        ).href,
    );
  }
  await verifyBundle(b, release.sha256);
  const manifest = record(JSON.parse(b["manifest.json"] || "null") as unknown);
  const expected = release.version.replace(/^v/, "");
  if (
    manifest?.id !== "wujie-sync" ||
    !(
      manifest.version === expected ||
      (release.fromGithub && manifest.version === expected.split("-")[0])
    )
  )
    throw Error("无界同步发行版本与安装包不匹配");
  return b;
}
