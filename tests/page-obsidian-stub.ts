export class Plugin {}
export class PluginSettingTab {
  constructor(public app: unknown) {}
}
export class TestElement {
  children: TestElement[] = [];
  classes = new Set<string>();
  text = "";
  hidden = false;
  isConnected = true;
  empty() {
    this.children = [];
  }
  addClass(...tokens: string[]) {
    for (const token of tokens) {
      // Obsidian 1.12 passes setClass directly to DOMTokenList.add.
      if (/\s/.test(token))
        throw Error("InvalidCharacterError: token contains whitespace");
      this.classes.add(token);
    }
  }
  setText(text: string) {
    this.text = text;
  }
  createDiv(options: { text?: string; cls?: string } = {}) {
    const el = new TestElement();
    el.text = options.text || "";
    if (options.cls) el.addClass(...options.cls.split(/\s+/));
    this.children.push(el);
    return el;
  }
  createSpan(options: { text?: string; cls?: string } = {}) {
    return this.createDiv(options);
  }
  createEl(_tag: string, options = {}) {
    return this.createDiv(options);
  }
}
class Control {
  selectEl = new TestElement();
  extraSettingsEl = new TestElement();
  constructor(private el: TestElement) {}
  setButtonText(text: string) {
    this.el.text = text;
    return this;
  }
  setDisabled(_disabled: boolean) {
    return this;
  }
  setPlaceholder(_text: string) {
    return this;
  }
  setValue(_text: string) {
    return this;
  }
  setIcon(_icon: string) {
    return this;
  }
  setTooltip(_text: string) {
    return this;
  }
  onClick(_callback: unknown) {
    return this;
  }
  onChange(_callback: unknown) {
    return this;
  }
}
export class Setting {
  settingEl: TestElement;
  nameEl: TestElement;
  descEl: TestElement;
  constructor(parent: TestElement) {
    this.settingEl = parent.createDiv();
    this.nameEl = this.settingEl.createDiv();
    this.descEl = this.settingEl.createDiv();
  }
  setName(text: string) {
    this.nameEl.setText(text);
    return this;
  }
  setDesc(text: string) {
    this.descEl.setText(text);
    return this;
  }
  setHeading() {
    return this;
  }
  setClass(token: string) {
    this.settingEl.addClass(token);
    return this;
  }
  addButton(callback: (control: Control) => unknown) {
    callback(new Control(this.settingEl.createDiv()));
    return this;
  }
  addSearch(callback: (control: Control) => unknown) {
    callback(new Control(this.settingEl.createDiv()));
    return this;
  }
  addExtraButton(callback: (control: Control) => unknown) {
    callback(new Control(this.settingEl.createDiv()));
    return this;
  }
}
export class Menu {}
export class Modal {}
export class Notice {
  constructor(...args: unknown[]) {}
}
export const requestUrl = () => {
  throw Error("unexpected request");
};
export const requireApiVersion = () =>
  !(globalThis as unknown as { __pmcnLegacy?: boolean }).__pmcnLegacy;
export const Platform = { isMobile: false };
