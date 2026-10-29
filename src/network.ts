import { requestUrl, PluginManifest } from "obsidian";
export const MIRRORS = [
  "https://ghfast.top/",
  "https://gh-proxy.com/",
  "https://gh.llkk.cc/",
  "https://ghproxy.net/",
  "https://gh.monlor.com/",
  "https://wget.la/",
];
export interface Entry {
  id: string;
  name: string;
  description: string;
  repo: string;
}
export class Network {
  last = "";
  wujieHistoryCacheUsed = false;
  private versionCache = new Map<
    string,
    { at: number; manifest: PluginManifest }
  >();
  private pendingVersions = new Map<string, Promise<PluginManifest>>();
  private async downloadText(
    url: string,
  ): Promise<{ status: number; text: string }> {
    let timer: number | undefined;
    try {
      return await Promise.race([
        requestUrl({ url, throw: false }),
        new Promise<never>((_, reject) => {
          timer = window.setTimeout(() => reject(Error("请求超时")), 12000);
        }),
      ]);
    } catch (nativeError) {
      const target = new URL(url);
      // Different native/WebView network stacks may behave differently on mobile.
      // Never send community/proxy URLs or credentials through this fallback.
      if (
        target.origin !== "https://user.wujiesync.cc" ||
        !target.pathname.startsWith("/download/") ||
        typeof window.fetch !== "function"
      )
        throw nativeError;
      const controller = new AbortController();
      const fetchTimer = window.setTimeout(() => controller.abort(), 12000);
      try {
        const response = await window.fetch(url, {
          credentials: "omit",
          cache: "no-store",
          referrerPolicy: "no-referrer",
          signal: controller.signal,
          redirect: "error",
        });
        return { status: response.status, text: await response.text() };
      } catch (browserError) {
        throw Error(
          "原生请求：" +
            String(nativeError) +
            "；浏览器请求：" +
            String(browserError),
        );
      } finally {
        window.clearTimeout(fetchTimer);
      }
    } finally {
      window.clearTimeout(timer);
    }
  }
  async latest(
    repo: string,
    current?: PluginManifest,
    force = false,
  ): Promise<PluginManifest> {
    const cached = this.versionCache.get(repo);
    if (!force && cached && Date.now() - cached.at < 300000)
      return cached.manifest;
    if (this.pendingVersions.has(repo)) return this.pendingVersions.get(repo)!;
    const request = this.lookupLatest(repo, current)
      .then((manifest) => {
        this.versionCache.set(repo, { at: Date.now(), manifest });
        return manifest;
      })
      .finally(() => this.pendingVersions.delete(repo));
    this.pendingVersions.set(repo, request);
    return request;
  }
  private async lookupLatest(
    repo: string,
    current?: PluginManifest,
  ): Promise<PluginManifest> {
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw Error("仓库地址错误");
    const r = await this.fastJson<{
      tag_name: string;
      prerelease: boolean;
      draft: boolean;
    }>("https://api.github.com/repos/" + repo + "/releases/latest");
    if (r.prerelease || r.draft || !/^\d+\.\d+\.\d+$/.test(r.tag_name))
      throw Error("没有可管理的正式发行版本");
    if (current && current.version === r.tag_name) return current;
    return this.fastJson(
      "https://github.com/" +
        repo +
        "/releases/download/" +
        encodeURIComponent(r.tag_name) +
        "/manifest.json",
    );
  }
  async fastJson<T>(url: string): Promise<T> {
    const prefixes = [
      ...new Set([...(this.last ? [this.last] : []), "", ...MIRRORS]),
    ].slice(0, 3);
    try {
      return await Promise.any(
        prefixes.map(async (prefix) => {
          let timer: number | undefined;
          try {
            const response = await Promise.race([
              requestUrl({ url: prefix + url, throw: false }),
              new Promise<never>((_, reject) => {
                timer = window.setTimeout(
                  () => reject(Error("版本查询超时")),
                  4500,
                );
              }),
            ]);
            if (response.status !== 200) throw Error("HTTP " + response.status);
            const value = JSON.parse(response.text) as T;
            if (prefix) this.last = prefix;
            return value;
          } finally {
            window.clearTimeout(timer);
          }
        }),
      );
    } catch {
      throw Error("版本查询暂不可用，请稍后重试");
    }
  }
  async get(url: string, validate: (s: string) => void = () => {}) {
    if (!url.startsWith("https://")) throw Error("下载仅允许 HTTPS");
    const urls =
      /^https:\/\/(raw.githubusercontent.com|github.com|api.github.com)\//.test(
        url,
      )
        ? [
            ...new Set([
              ...(url.startsWith("https://api.github.com/") ? [""] : []),
              ...(this.last ? [this.last] : []),
              ...MIRRORS,
              "",
            ]),
          ].map((p) => p + url)
        : [url];
    const errors: string[] = [];
    for (const u of urls) {
      try {
        const r = await this.downloadText(u);
        if (r.status !== 200) throw Error("HTTP " + r.status);
        if (r.text.length > 20_000_000) throw Error("文件过大");
        validate(r.text);
        if (u !== url) this.last = u.slice(0, u.length - url.length);
        return r.text;
      } catch (e) {
        errors.push(new URL(u).hostname + ": " + String(e));
      }
    }
    throw Error("下载源均失败：" + errors.join("；"));
  }
  async json<T>(url: string): Promise<T> {
    return JSON.parse(
      await this.get(url, (s) => {
        JSON.parse(s);
      }),
    ) as T;
  }
  async catalog(): Promise<Entry[]> {
    const data = await this.json<Entry[]>(
      "https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugins.json",
    );
    if (!Array.isArray(data)) throw Error("目录格式错误");
    return data.filter(
      (e) =>
        typeof e.id === "string" &&
        typeof e.repo === "string" &&
        /^[\w.-]+\/[\w.-]+$/.test(e.repo),
    );
  }
  async manifest(repo: string): Promise<PluginManifest> {
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw Error("仓库地址错误");
    return this.fastJson(
      "https://raw.githubusercontent.com/" + repo + "/HEAD/manifest.json",
    );
  }
  async release(repo: string, version: string) {
    const base =
      "https://github.com/" +
      repo +
      "/releases/download/" +
      encodeURIComponent(version) +
      "/";
    const manifest = await this.get(base + "manifest.json", (s) => {
      JSON.parse(s);
    });
    const main = await this.get(base + "main.js", (s) => {
      if (!s.trim() || /^\s*</.test(s)) throw Error("无效脚本");
    });
    // Missing CSS is accepted only when all upstream responses establish 404.
    let css: string | null = null;
    try {
      css = await this.get(base + "styles.css", (s) => {
        if (/^\s*</.test(s)) throw Error("无效样式");
      });
    } catch (e) {
      const errors = String(e).split("：").slice(1).join("：").split("；");
      if (!errors.length || !errors.every((x) => x.endsWith("HTTP 404")))
        throw e;
    }
    return { "manifest.json": manifest, "main.js": main, "styles.css": css };
  }
}
