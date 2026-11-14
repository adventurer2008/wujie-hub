import { Plugin, Setting, Notice, Modal, PluginManifest, Menu } from "obsidian";
import { Network, Entry } from "./network";
import { record, manifestVersion } from "./json";
import { Installer } from "./installer";
import { TRANSLATE_ID, downloadTranslateAlpha, loadTranslateAlpha } from "./wujie-translate";
import {
  SMART_SYNC_ID,
  downloadSmartSync,
  loadSmartSyncReleases,
  parseSmartSyncFeed,
  smartSyncReleaseKey,
} from "./smart-sync";
import {
  manager,
  openPluginSettings,
  CompatibleSettingsTab,
  PortableSettingDefinition,
} from "./compat";
import { Bundle, compare, readBundle, isManagerPlugin } from "./core";
import {
  WujieRelease,
  loadWujieReleases,
  loadSiteAlpha,
  recentReleases,
  defaultReleaseVersion,
  downloadWujie,
  hashes,
  verifyBundle,
} from "./wujie";
interface State {
  catalog: Entry[];
  lastMirror: string;
  verified?: Bundle;
  verifiedHashes?: Record<string, string>;
  verifiedAt?: string;
  wujieReleases?: WujieRelease[];
  installedWujieTag?: string;
  feedUrl?: string;
  smartSyncReleases?: WujieRelease[];
  smartSyncBackup?: {
    bundle: Bundle;
    sha256: Record<string, string>;
    verifiedAt?: string;
  };
}
const SYNC_DESCRIPTION =
  "Sync notes, attachments and selected settings with compression and client-side encryption.";
class Confirm extends Modal {
  constructor(
    app: Plugin["app"],
    private message: string,
    private done: (v: boolean) => void,
  ) {
    super(app);
  }
  answered = false;
  onOpen() {
    this.contentEl.createEl("p", { text: this.message });
    new Setting(this.contentEl)
      .addButton((b) => b.setButtonText("取消").onClick(() => this.close()))
      .addButton((b) =>
        b
          .setButtonText("确认")
          .setCta()
          .onClick(() => {
            this.answered = true;
            this.done(true);
            this.close();
          }),
      );
  }
  onClose() {
    if (!this.answered) this.done(false);
  }
}
export default class PM extends Plugin {
  state: State = { catalog: [], lastMirror: "" };
  net = new Network();
  installer!: Installer;
  async onload() {
    const saved: unknown = await this.loadData();
    this.state = { ...this.state, ...record(saved) };
    this.net.last = this.state.lastMirror;
    this.installer = new Installer(this.app, this.manifest.id);
    this.addSettingTab(new Page(this));
    this.addCommand({
      id: "open-manager",
      name: "打开插件管理",
      callback: () => {
        try {
          openPluginSettings(this.app, this.manifest.id);
        } catch (error) {
          new Notice(String(error));
        }
      },
    });
  }
  async save() {
    this.state.lastMirror = this.net.last;
    await this.saveData(this.state);
  }
  confirm(text: string) {
    return new Promise<boolean>((resolve) =>
      new Confirm(this.app, text, resolve).open(),
    );
  }
}
class Page extends CompatibleSettingsTab {
  query = "";
  updatesChecked = false;
  sortDescending = false;
  visibleLimit = 5;
  catalogAttempted = false;
  resultMetaEls = new Map<string, HTMLElement>();
  resultMetadata = new Map<string, PluginManifest>();
  resultPending = new Set<string>();
  results: Entry[] = [];
  latest = new Map<string, PluginManifest>();
  status = "";
  working = false;
  releases: WujieRelease[] = [];
  selected = "";
  manualSelection = false;
  alphaSourceWarning = "";
  pageVisible = false;
  openGeneration = 0;
  refreshWujieView?: () => void;
  refreshSmartSyncView?: () => void;
  smartSyncSelected = "";
  smartSyncReleases: WujieRelease[] = [];
  smartSyncManualSelection = false;
  smartSyncWarning = "";
  smartSyncGeneration = 0;
  translateRelease?: Awaited<ReturnType<typeof loadTranslateAlpha>>;
  refreshTranslateView?: () => void;

  constructor(private pm: PM) {
    super(pm.app, pm);
    this.releases = pm.state.wujieReleases || [];
    this.selected = defaultReleaseVersion(recentReleases(this.releases));
    try {
      this.smartSyncReleases = parseSmartSyncFeed({
        pluginId: SMART_SYNC_ID,
        releases: (pm.state.smartSyncReleases || []).map((release) => ({
          ...release,
          id: SMART_SYNC_ID,
        })),
      });
    } catch {
      this.smartSyncWarning = "Smart Sync 本机版本缓存无效，正在重新获取";
    }
    this.selectSmartSyncDefault();
  }
  selectDefaultRelease() {
    const visible = recentReleases(this.releases);
    if (
      this.manualSelection &&
      visible.some((r) => r.version === this.selected)
    )
      return;
    this.manualSelection = false;
    this.selected = defaultReleaseVersion(visible);
  }
  hide() {
    this.pageVisible = false;
    this.openGeneration++;
    this.smartSyncGeneration++;
    this.refreshWujieView = undefined;
    this.refreshSmartSyncView = undefined;
    this.refreshTranslateView = undefined;
    this.query = "";
    this.resultMetaEls.clear();
  }
  async task(fn: () => Promise<void>) {
    if (this.working) return;
    this.working = true;
    this.status = "处理中…";
    this.refreshSettings();
    try {
      await fn();
      await this.pm.save();
      this.status = "";
      new Notice("操作完成", 2000);
    } catch (e) {
      this.status = String(e);
      new Notice(this.status, 10000);
    } finally {
      this.working = false;
      this.refreshSettings();
      // Declarative settings updates do not always rerun a custom renderer.
      if (this.pageVisible) this.refreshWujieView?.();
      if (this.pageVisible) this.refreshSmartSyncView?.();
      if (this.pageVisible) this.refreshTranslateView?.();
    }
  }
  button(s: Setting, label: string, fn: () => Promise<void>) {
    s.addButton((b) =>
      b
        .setButtonText(label)
        .setDisabled(this.working)
        .onClick(() => void this.task(fn)),
    );
  }
  renderLegacy(): void {
    this.renderPage(this.containerEl);
  }
  pageTitle(): string {
    return this.pm.manifest.name + " v" + this.pm.manifest.version;
  }
  getSettingDefinitions(): PortableSettingDefinition[] {
    return [
      {
        name: this.pageTitle(),
        desc: "插件安装中心：搜索、安装和升级社区插件；管理无界同步与 Smart Sync 版本。",
        aliases: [
          "插件安装中心",
          "安装",
          "升级",
          "更新",
          "无界同步",
          "Smart Sync",
          "Alpha",
          "回退",
        ],
        render: (setting) => {
          setting.settingEl.empty();
          setting.settingEl.addClass("pmcn-settings-root");
          this.renderPage(setting.settingEl);
        },
      },
    ];
  }
  renderPage(el: HTMLElement) {
    const opening = !this.pageVisible;
    this.pageVisible = true;
    if (opening) {
      this.openGeneration++;
      this.manualSelection = false;
      this.selectDefaultRelease();
      this.smartSyncManualSelection = false;
      this.selectSmartSyncDefault();
    }
    el.empty();
    const heading = new Setting(el)
      .setName(this.pageTitle())
      .setDesc("插件安装中心")
      .setHeading();
    heading.descEl.createDiv({
      text: "便捷搜索、安装和升级 Obsidian 官方社区插件，以及管理无界同步与 Smart Sync 版本。",
    });
    if (this.status) el.createDiv({ cls: "pmcn-status", text: this.status });

    const p = manager(this.app);
    const searchArea = el.createDiv({ cls: "pmcn-browser-controls" });
    const search = new Setting(searchArea).setClass("pmcn-browser-search");
    const summary = searchArea.createDiv({ cls: "pmcn-browser-summary" });
    const panel = el.createDiv({ cls: "pmcn-installed pmcn-search-results" });
    const renderRows = () => {
      panel.empty();
      this.resultMetaEls.clear();
      const entries = new Map(this.pm.state.catalog.map((e) => [e.id, e]));
      const q = this.query.trim().toLowerCase();
      panel.hidden = !q;
      summary.hidden = !q;
      if (!q) {
        summary.empty();
        return;
      }
      const rank = (entry: Entry) => {
        const name = entry.name.toLowerCase(),
          id = entry.id.toLowerCase();
        return name === q || id === q
          ? 0
          : name.startsWith(q) || id.startsWith(q)
            ? 1
            : name.includes(q) || id.includes(q)
              ? 2
              : 3;
      };
      const matched = [...entries.values()]
        .filter(
          (entry) => entry.id !== "wujie-sync" && entry.id !== SMART_SYNC_ID,
        )
        .filter((e) =>
          (
            e.name +
            " " +
            e.description +
            " " +
            e.id +
            " " +
            (p.manifests[e.id]?.author ||
              this.resultMetadata.get(e.id)?.author ||
              "")
          )
            .toLowerCase()
            .includes(q),
        )
        .sort(
          (a, b) =>
            rank(a) - rank(b) ||
            (this.sortDescending ? -1 : 1) * a.name.localeCompare(b.name),
        );
      summary.setText(
        "找到 " +
          matched.length.toLocaleString() +
          " 个插件" +
          (matched.length > this.visibleLimit
            ? "，显示前 " + this.visibleLimit + " 个，请细化关键词"
            : "") +
          (!this.pm.state.catalog.length ? " · 社区目录尚未加载" : ""),
      );
      if (!matched.length)
        panel.createDiv({
          cls: "pmcn-empty",
          text: "没有匹配的插件",
        });
      for (const e of matched.slice(0, this.visibleLimit)) {
        const installed = p.manifests[e.id],
          known = installed || this.resultMetadata.get(e.id);
        const row = new Setting(panel).setClass("pmcn-installed-row");
        row.nameEl.createSpan({ cls: "pmcn-plugin-name", text: e.name });
        const meta = row.nameEl.createSpan({
          cls: "pmcn-plugin-meta",
          text: known
            ? " v" + known.version + " 作者：" + (known.author || "未知")
            : " · 正在查询版本与作者…",
        });
        this.resultMetaEls.set(e.id, meta);
        row.setDesc(e.description || e.id);
        if (!known && e.repo && !this.resultPending.has(e.id)) {
          this.resultPending.add(e.id);
          this.queueMetadata(async () => {
            try {
              const m = await this.pm.net.latest(e.repo);
              this.resultMetadata.set(e.id, m);
              const live = this.resultMetaEls.get(e.id);
              if (live?.isConnected)
                live.setText(
                  " v" + m.version + " 作者：" + (m.author || "未知"),
                );
            } catch {
              const live = this.resultMetaEls.get(e.id);
              if (live?.isConnected) live.setText(" · 版本信息暂不可用");
            } finally {
              this.resultPending.delete(e.id);
            }
          });
        }

        if (installed) {
          const protectedPlugin =
            isManagerPlugin(e.id, this.pm.manifest.id) ||
            e.id === "wujie-sync" ||
            e.id === SMART_SYNC_ID;
          if (this.hasUpdate(installed) && !protectedPlugin)
            this.button(row, "加速更新", () => this.installCommunity(e));
          else
            row.addButton((button) =>
              button.setButtonText("已安装").setDisabled(true),
            );
        } else if (e.id === SMART_SYNC_ID)
          row.addButton((button) =>
            button
              .setButtonText("请到 Smart Sync 专属区安装")
              .setDisabled(true),
          );
        else this.button(row, "安装", () => this.installCommunity(e));
      }
    };
    const loadCatalog = () => {
      if (
        !this.query.trim() ||
        this.pm.state.catalog.length ||
        this.catalogAttempted
      )
        return;
      this.catalogAttempted = true;
      summary.setText("正在读取社区插件目录…");
      void this.pm.net
        .catalog()
        .then(async (entries) => {
          this.pm.state.catalog = entries;
          await this.pm.save();
          if (summary.isConnected) renderRows();
        })
        .catch(() => {
          this.catalogAttempted = false;
          if (summary.isConnected && this.query.trim())
            summary.setText("社区目录暂不可用，请稍后重新搜索");
        });
    };
    search.addSearch((t) =>
      t
        .setPlaceholder("搜索社区插件…")
        .setValue(this.query)
        .onChange((v) => {
          this.query = v;
          this.visibleLimit = 5;
          renderRows();
          loadCatalog();
        }),
    );
    search.addExtraButton((b) =>
      b
        .setIcon("arrow-up-narrow-wide")
        .setTooltip("排序")
        .onClick(() => {
          new Menu()
            .addItem((item) =>
              item
                .setTitle("名称 A → Z")
                .setChecked(!this.sortDescending)
                .onClick(() => {
                  this.sortDescending = false;
                  renderRows();
                }),
            )
            .addItem((item) =>
              item
                .setTitle("名称 Z → A")
                .setChecked(this.sortDescending)
                .onClick(() => {
                  this.sortDescending = true;
                  renderRows();
                }),
            )
            .showAtPosition({
              x: b.extraSettingsEl.getBoundingClientRect().left,
              y: b.extraSettingsEl.getBoundingClientRect().bottom,
            });
        }),
    );
    renderRows();
    loadCatalog();
    const communityContainer = el.createDiv({ cls: "pmcn-community-section" });
    const updateControls = new Setting(communityContainer)
      .setName("已安装插件")
      .setClass("pmcn-update-controls")
      .setClass("pmcn-section-heading");
    this.button(updateControls, "检查更新", async () => {
      await p.loadManifests();
      if (!this.pm.state.catalog.length)
        this.pm.state.catalog = await this.pm.net.catalog();
      this.latest.clear();
      let failures = 0;
      const targets = Object.values(p.manifests).filter(
        (m) =>
          !isManagerPlugin(m.id, this.pm.manifest.id) &&
          m.id !== "wujie-sync" &&
          m.id !== SMART_SYNC_ID &&
          this.pm.state.catalog.some((e) => e.id === m.id),
      );
      let index = 0,
        finished = 0;
      const progress = new Notice("正在检查更新 0/" + targets.length, 0);
      try {
        await Promise.all(
          Array.from({ length: Math.min(4, targets.length) }, async () => {
            while (index < targets.length) {
              const manifest = targets[index++],
                entry = this.pm.state.catalog.find(
                  (e) => e.id === manifest.id,
                )!;
              try {
                this.latest.set(
                  manifest.id,
                  await this.pm.net.latest(entry.repo, manifest),
                );
              } catch {
                failures++;
              }
              finished++;
              progress.setMessage(
                "正在检查更新 " + finished + "/" + targets.length,
              );
            }
          }),
        );
      } finally {
        progress.hide();
      }
      this.updatesChecked = true;
      if (failures) new Notice(failures + " 个插件未能查询版本，可稍后重试");
      const count = Object.values(p.manifests).filter(
        (m) =>
          !isManagerPlugin(m.id, this.pm.manifest.id) &&
          m.id !== "wujie-sync" &&
          m.id !== SMART_SYNC_ID &&
          this.hasUpdate(m),
      ).length;
      new Notice(
        count
          ? "发现 " + count + " 个可更新插件"
          : failures
            ? "已成功查询的插件暂无更新"
            : "已安装插件暂无更新",
      );
    });
    const updatable = Object.values(p.manifests).filter(
      (m) =>
        !isManagerPlugin(m.id, this.pm.manifest.id) &&
        m.id !== "wujie-sync" &&
        m.id !== SMART_SYNC_ID &&
        this.hasUpdate(m),
    );
    if (this.updatesChecked && updatable.length) {
      this.button(updateControls, "全部加速更新", async () => {
        for (const m of updatable) {
          const e = this.pm.state.catalog.find((e) => e.id === m.id);
          if (e) await this.installCommunity(e);
        }
      });
      const updateRows = communityContainer.createDiv({
        cls: "pmcn-installed",
      });
      for (const m of updatable) {
        const e = this.pm.state.catalog.find((e) => e.id === m.id);
        if (!e) continue;
        const row = new Setting(updateRows)
          .setClass("pmcn-installed-row")
          .setName(m.name)
          .setDesc(m.version + " → " + this.latest.get(m.id)!.version);
        this.button(row, "加速更新", () => this.installCommunity(e));
      }
    }
    const wujieContainer = el.createDiv({ cls: "pmcn-sync-section" });
    const renderWujie = () => {
      const el = wujieContainer;
      el.empty();
      const current = p.manifests["wujie-sync"];
      const wujieRow = new Setting(el)
        .setClass("pmcn-installed-row")
        .setClass("pmcn-wujie-row");
      wujieRow.nameEl.createSpan({ cls: "pmcn-plugin-name", text: "无界同步" });
      wujieRow.nameEl.createSpan({
        cls: "pmcn-plugin-meta",
        text:
          (current ? " v" + current.version : " · 未安装") +
          " 作者：" +
          (current?.author || "lihy"),
      });
      wujieRow.setDesc(SYNC_DESCRIPTION);
      if (this.alphaSourceWarning)
        el.createDiv({ cls: "pmcn-status", text: this.alphaSourceWarning });

      wujieRow.addExtraButton((b) =>
        b
          .setIcon("more-vertical")
          .setTooltip("回退版本")
          .setDisabled(this.working)
          .onClick(() => {
            new Menu()
              .addItem((item) =>
                item
                  .setTitle("标记当前版本正常")
                  .setDisabled(!current)
                  .onClick(
                    () =>
                      void this.task(async () => {
                        if (
                          await this.pm.confirm(
                            "确认已在本机验证当前无界同步工作正常？保存代码作为回退目标，保留本机配置。",
                          )
                        )
                          await this.markWujieVerified();
                      }),
                  ),
              )
              .showAtPosition({
                x: b.extraSettingsEl.getBoundingClientRect().left,
                y: b.extraSettingsEl.getBoundingClientRect().bottom,
              });
          }),
      );
      this.button(wujieRow, "检查更新", async () => {
        await this.refreshWujieAll();
      });
      if (this.pm.state.verified) {
        let version = "已确认版本";
        try {
          version = manifestVersion(this.pm.state.verified["manifest.json"]!);
        } catch {
          version = "无效快照";
        }
        this.button(wujieRow, "回退至 " + version, async () => {
          const bundle = this.pm.state.verified!;
          if (this.pm.state.verifiedHashes)
            await verifyBundle(bundle, this.pm.state.verifiedHashes);
          await this.pm.installer.install("wujie-sync", bundle);
          this.pm.state.installedWujieTag = manifestVersion(
            bundle["manifest.json"]!,
          );
          new Notice("已恢复本机确认正常的代码版本；当前配置保持不变");
        });
        wujieRow.descEl.createDiv({
          cls: "pmcn-plugin-meta",
          text: "回退目标：" + version + "（本机已确认正常；仅恢复代码）",
        });
      }
      if (recentReleases(this.releases).length) {
        const recent = recentReleases(this.releases);
        this.selectDefaultRelease();
        const choices = new Setting(el)
          .setName("历史版本")
          .setClass("pmcn-release-picker");
        choices.addDropdown((d) => {
          if (!this.selected)
            d.selectEl.createEl("option", {
              text: "请选择版本",
              attr: { value: "" },
            });
          for (const [channel, label] of [
            ["Stable", "稳定版"],
            ["Alpha", "测试版"],
          ] as const) {
            const versions = recent.filter((r) => r.channel === channel);
            if (!versions.length) continue;
            const group = d.selectEl.createEl("optgroup", { attr: { label } });
            for (const r of versions)
              group.createEl("option", {
                text: r.version,
                attr: { value: r.version },
              });
          }
          d.setValue(this.selected)
            .setDisabled(this.working)
            .onChange((v) => {
              this.selected = v;
              this.manualSelection = true;
            });
        });
        this.button(choices, "安装所选版本", async () => {
          const r = this.releases.find((r) => r.version === this.selected);
          if (!r) throw Error("请选择可用版本");
          await this.installWujie(r);
        });
      }
    };
    this.refreshWujieView = renderWujie;
    renderWujie();
    const translateContainer = el.createDiv({ cls: "pmcn-sync-section" });
    this.refreshTranslateView = () => {
      translateContainer.empty();
      const installed = manager(this.app).manifests[TRANSLATE_ID];
      const release = this.translateRelease;
      const row = new Setting(translateContainer)
        .setName("无界译")
        .setDesc("国内 Alpha · " + (installed ? "已安装 " + installed.version : "未安装"));
      this.button(row, "检查 Alpha", async () => {
        this.translateRelease = undefined;
        this.translateRelease = await loadTranslateAlpha(this.pm.net);
      });
      if (release) this.button(row, "安装 " + release.version, async () => {
        const latest = await loadTranslateAlpha(this.pm.net);
        this.translateRelease = latest;
        if (latest.version !== release.version) throw Error("Alpha 已更新，请确认新版本后安装");
        await this.pm.installer.install(TRANSLATE_ID, await downloadTranslateAlpha(this.pm.net, latest), latest.version);
      });
    };
    this.refreshTranslateView();
    const smartSyncContainer = el.createDiv({ cls: "pmcn-sync-section" });
    const renderSmartSync = () => {
      smartSyncContainer.empty();
      const current = manager(this.app).manifests[SMART_SYNC_ID];
      const row = new Setting(smartSyncContainer)
        .setClass("pmcn-installed-row")
        .setClass("pmcn-wujie-row");
      row.nameEl.createSpan({ cls: "pmcn-plugin-name", text: "Smart Sync" });
      row.nameEl.createSpan({
        cls: "pmcn-plugin-meta",
        text:
          (current ? " v" + current.version : " · 未安装") +
          " 作者：" +
          (current?.author || "lihy"),
      });
      row.setDesc(SYNC_DESCRIPTION);
      if (this.smartSyncWarning)
        smartSyncContainer.createDiv({
          cls: "pmcn-status",
          text: this.smartSyncWarning,
        });
      row.addExtraButton((button) =>
        button
          .setIcon("more-vertical")
          .setTooltip("回退版本")
          .setDisabled(this.working)
          .onClick(() => {
            new Menu()
              .addItem((item) =>
                item
                  .setTitle("标记当前版本正常")
                  .setDisabled(!current)
                  .onClick(
                    () =>
                      void this.task(async () => {
                        if (
                          await this.pm.confirm(
                            "确认已在本机验证当前 Smart Sync 工作正常？保存代码作为回退目标，保留本机配置。",
                          )
                        )
                          await this.markSmartSyncVerified();
                      }),
                  ),
              )
              .showAtPosition({
                x: button.extraSettingsEl.getBoundingClientRect().left,
                y: button.extraSettingsEl.getBoundingClientRect().bottom,
              });
          }),
      );
      this.button(row, "检查更新", async () => {
        await this.refreshSmartSyncReleases();
        if (this.smartSyncWarning) throw Error(this.smartSyncWarning);
      });
      const backup = this.pm.state.smartSyncBackup;
      if (backup) {
        const version = manifestVersion(backup.bundle["manifest.json"]!);
        this.button(
          row,
          backup.verifiedAt ? "回退至 " + version : "恢复安装前版本",
          async () => {
            if (
              !(await this.pm.confirm(
                "恢复 Smart Sync 代码？保留当前配置；不能撤销配置或云端数据迁移。" +
                  (backup.verifiedAt
                    ? "目标已由你在本机确认正常。"
                    : "安装前快照不代表已验证正常。"),
              ))
            )
              return;
            await verifyBundle(backup.bundle, backup.sha256);
            await this.pm.installer.install(SMART_SYNC_ID, backup.bundle);
          },
        );
        row.descEl.createDiv({
          cls: "pmcn-plugin-meta",
          text:
            "回退目标：" +
            version +
            (backup.verifiedAt
              ? "（本机已确认正常；仅恢复代码）"
              : "（安装前快照；未确认正常）"),
        });
      }
      const recent = recentReleases(this.smartSyncReleases);
      if (!recent.length) {
        smartSyncContainer.createDiv({
          cls: "pmcn-plugin-meta",
          text: "暂无可用版本，请检查更新",
        });
        return;
      }
      this.selectSmartSyncDefault();
      const choices = new Setting(smartSyncContainer)
        .setName("历史版本")
        .setClass("pmcn-release-picker");
      choices.addDropdown((dropdown) => {
        if (!this.smartSyncSelected)
          dropdown.selectEl.createEl("option", {
            text: "请选择版本",
            attr: { value: "" },
          });
        for (const [channel, label] of [
          ["Stable", "稳定版"],
          ["Alpha", "测试版"],
        ] as const) {
          const versions = recent.filter(
            (release) => release.channel === channel,
          );
          if (!versions.length) continue;
          const group = dropdown.selectEl.createEl("optgroup", {
            attr: { label },
          });
          for (const release of versions)
            group.createEl("option", {
              text: release.version,
              attr: { value: smartSyncReleaseKey(release) },
            });
        }
        dropdown
          .setValue(this.smartSyncSelected)
          .setDisabled(this.working)
          .onChange((value) => {
            this.smartSyncSelected = value;
            this.smartSyncManualSelection = true;
          });
      });
      this.button(choices, "安装所选版本", async () => {
        const release = this.smartSyncReleases.find(
          (entry) => smartSyncReleaseKey(entry) === this.smartSyncSelected,
        );
        if (!release) throw Error("请选择可用版本");
        await this.installSmartSync(release);
      });
    };
    this.refreshSmartSyncView = renderSmartSync;
    renderSmartSync();
    if (opening) {
      void this.refreshWujieAll(false).catch((error) => {
        if (!this.pageVisible) return;
        this.alphaSourceWarning =
          "无界同步刷新失败，保留上次记录：" + String(error);
        this.refreshWujieView?.();
      });
      void this.refreshSmartSyncReleases();
    }
  }

  selectSmartSyncDefault() {
    const visible = recentReleases(this.smartSyncReleases);
    if (
      this.smartSyncManualSelection &&
      visible.some(
        (release) => smartSyncReleaseKey(release) === this.smartSyncSelected,
      )
    )
      return;
    this.smartSyncManualSelection = false;
    const version = defaultReleaseVersion(visible);
    this.smartSyncSelected = version ? "Stable:" + version : "";
  }

  async refreshSmartSyncReleases() {
    const generation = ++this.smartSyncGeneration;
    try {
      const releases = await loadSmartSyncReleases(this.pm.net);
      if (!this.pageVisible || generation !== this.smartSyncGeneration) return;
      this.smartSyncReleases = releases;
      this.pm.state.smartSyncReleases = releases;
      this.smartSyncWarning = "";
      this.selectSmartSyncDefault();
      try {
        await this.pm.save();
      } catch (error) {
        this.smartSyncWarning =
          "Smart Sync 清单已刷新，但本机缓存保存失败：" + String(error);
      }
    } catch (error) {
      if (!this.pageVisible || generation !== this.smartSyncGeneration) return;
      this.smartSyncWarning =
        "Smart Sync 刷新失败，保留上次记录：" + String(error);
    }
    if (this.pageVisible && generation === this.smartSyncGeneration)
      this.refreshSmartSyncView?.();
  }

  async markSmartSyncVerified() {
    const bundle = await readBundle(
      this.app.vault.adapter,
      this.app.vault.configDir + "/plugins/" + SMART_SYNC_ID,
    );
    this.pm.installer.validate(SMART_SYNC_ID, bundle);
    this.pm.state.smartSyncBackup = {
      bundle,
      sha256: await hashes(bundle),
      verifiedAt: new Date().toISOString(),
    };
    await this.pm.save();
  }

  async installSmartSync(release: WujieRelease) {
    if (
      !(await this.pm.confirm(
        "安装 Smart Sync " +
          release.version +
          "（" +
          (release.channel === "Alpha" ? "Alpha 测试渠道" : "稳定版") +
          "）？" +
          (release.channel === "Alpha" ? "请在隔离测试库使用，" : "") +
          "海外账号与国内版独立。将校验 SHA-256，保留配置；首次安装后需在第三方插件设置中手动启用。更新保留原启用状态，代码回退不能撤销配置或云端数据迁移。",
      ))
    )
      return;
    const bundle = await downloadSmartSync(this.pm.net, release);
    this.pm.installer.validate(SMART_SYNC_ID, bundle);
    const current = manager(this.app).manifests[SMART_SYNC_ID];
    if (current && !this.pm.state.smartSyncBackup) {
      const previous = await readBundle(
        this.app.vault.adapter,
        this.app.vault.configDir + "/plugins/" + SMART_SYNC_ID,
      );
      this.pm.installer.validate(SMART_SYNC_ID, previous);
      this.pm.state.smartSyncBackup = {
        bundle: previous,
        sha256: await hashes(previous),
      };
      await this.pm.save();
    }
    await this.pm.installer.install(SMART_SYNC_ID, bundle, release.version);
  }

  async refreshWujieAll(notify = true) {
    const generation = ++this.openGeneration;
    const [history, alpha] = await Promise.allSettled([
      loadWujieReleases(this.pm.net, this.pm.state.feedUrl),
      loadSiteAlpha(this.pm.net),
    ]);
    if (!this.pageVisible || generation !== this.openGeneration) return;
    if (history.status === "rejected" && alpha.status === "rejected")
      throw Error(
        "Alpha：" +
          String(alpha.reason) +
          "；稳定版：" +
          String(history.reason),
      );
    const nextAlpha =
      alpha.status === "fulfilled"
        ? alpha.value.filter((r) => r.channel === "Alpha")
        : this.releases.filter((r) => r.channel === "Alpha");
    const nextStable =
      history.status === "fulfilled"
        ? history.value.filter((r) => r.channel === "Stable")
        : this.releases.filter((r) => r.channel === "Stable");
    this.releases = [...nextAlpha, ...nextStable];
    this.pm.state.wujieReleases = this.releases;
    this.selectDefaultRelease();
    this.alphaSourceWarning =
      alpha.status === "rejected"
        ? "Alpha 刷新失败：" + String(alpha.reason)
        : "";
    if (notify)
      new Notice(
        alpha.status === "rejected"
          ? "稳定版已刷新，Alpha 暂时使用上次记录"
          : history.status === "rejected"
            ? "Alpha 已刷新，稳定版暂时使用上次记录：" + String(history.reason)
            : "Alpha 与稳定版本已刷新",
      );
  }
  async refreshAlphaOnOpen(generation: number) {
    try {
      const alpha = await loadSiteAlpha(this.pm.net);
      if (!this.pageVisible || generation !== this.openGeneration) return;
      this.alphaSourceWarning = "";
      this.releases = [
        ...alpha.filter((r) => r.channel === "Alpha"),
        ...this.releases.filter((r) => r.channel === "Stable"),
      ];
      this.pm.state.wujieReleases = this.releases;
      this.selectDefaultRelease();
      if (!this.working) {
        try {
          await this.pm.save();
        } catch (error) {
          this.alphaSourceWarning =
            "Alpha 已刷新，但本机缓存保存失败：" + String(error);
        }
        if (this.pageVisible && generation === this.openGeneration)
          this.refreshWujieView?.();
      }
    } catch (error) {
      if (this.pageVisible && generation === this.openGeneration) {
        const cached = this.releases.some((r) => r.channel === "Alpha");
        this.alphaSourceWarning =
          "Alpha 刷新失败：" +
          String(error) +
          (cached ? "；当前显示上次记录" : "；暂无本机 Alpha 缓存");
        this.refreshWujieView?.();
        new Notice(
          "Alpha 刷新失败，详细原因见无界同步区域" +
            (cached ? "；保留上次记录" : ""),
          7000,
        );
      }
    }
  }
  async markWujieVerified() {
    const bundle = await readBundle(
      this.app.vault.adapter,
      this.app.vault.configDir + "/plugins/wujie-sync",
    );
    this.pm.installer.validate("wujie-sync", bundle);
    this.pm.state.verified = bundle;
    this.pm.state.verifiedHashes = await hashes(bundle);
    this.pm.state.verifiedAt = new Date().toISOString();
    await this.pm.save();
  }
  async installWujie(release: WujieRelease) {
    const current = manager(this.app).manifests["wujie-sync"];
    if (release.channel === "Alpha" && current && !this.pm.state.verified) {
      if (
        !(await this.pm.confirm(
          "安装 Alpha 前，请确认当前版本已在本机验证正常，并将其保存为一键回退目标。确认后继续？",
        ))
      )
        return;
      await this.markWujieVerified();
    }
    if (
      !(await this.pm.confirm(
        "安装无界同步 " +
          release.channel +
          " " +
          release.version +
          "？会校验发行清单中的文件摘要并保留本机配置；切换代码无法撤销配置或云端数据迁移。",
      ))
    )
      return;
    const bundle = await downloadWujie(this.pm.net, release);
    await this.pm.installer.install("wujie-sync", bundle);
    this.pm.state.installedWujieTag = release.version;
  }
  metadataQueue: Array<() => Promise<void>> = [];
  metadataActive = 0;
  queueMetadata(work: () => Promise<void>) {
    this.metadataQueue.push(work);
    this.pumpMetadata();
  }
  pumpMetadata() {
    while (this.metadataActive < 3 && this.metadataQueue.length) {
      const work = this.metadataQueue.shift()!;
      this.metadataActive++;
      void work().finally(() => {
        this.metadataActive--;
        this.pumpMetadata();
      });
    }
  }
  hasUpdate(m: PluginManifest) {
    const latest = this.latest.get(m.id);
    if (!latest) return false;
    try {
      return compare(latest.version, m.version) > 0;
    } catch {
      return false;
    }
  }
  async installCommunity(e: Entry) {
    if (
      isManagerPlugin(e.id, this.pm.manifest.id) ||
      e.id === "wujie-sync" ||
      e.id === SMART_SYNC_ID
    )
      throw Error("请使用对应专属管理方式");
    const m = await this.pm.net.latest(e.repo, undefined, true);
    if (
      !(await this.pm.confirm(
        "安装 " +
          e.name +
          " " +
          m.version +
          "？文件通过第三方加速下载，暂无法验证作者提供的文件校验信息。请确认信任该插件后安装。",
      ))
    )
      return;
    const b = await this.pm.net.release(e.repo, m.version);
    await this.pm.installer.install(e.id, b, m.version);
    this.latest.set(e.id, m);
  }
}
