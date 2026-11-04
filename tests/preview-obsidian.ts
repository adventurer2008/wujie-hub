export class Plugin {}
export class PluginSettingTab {
  constructor(public app: unknown) {}
}
type ElementOptions = {
  text?: string;
  cls?: string;
  attr?: Record<string, string>;
};
const make = (
  parent: HTMLElement,
  tag: string,
  options: ElementOptions = {},
) => {
  const element = document.createElement(tag);
  element.textContent = options.text || "";
  if (options.cls) element.className = options.cls;
  for (const [key, value] of Object.entries(options.attr || {}))
    element.setAttribute(key, value);
  parent.append(element);
  return element;
};
Object.assign(HTMLElement.prototype, {
  empty(this: HTMLElement) {
    this.replaceChildren();
  },
  addClass(this: HTMLElement, ...classes: string[]) {
    this.classList.add(...classes);
  },
  setText(this: HTMLElement, text: string) {
    this.textContent = text;
  },
  createDiv(this: HTMLElement, options?: ElementOptions) {
    return make(this, "div", options);
  },
  createSpan(this: HTMLElement, options?: ElementOptions) {
    return make(this, "span", options);
  },
  createEl(this: HTMLElement, tag: string, options?: ElementOptions) {
    return make(this, tag, options);
  },
});
class Control {
  selectEl: HTMLSelectElement;
  extraSettingsEl: HTMLElement;
  constructor(
    public element: HTMLInputElement | HTMLButtonElement | HTMLSelectElement,
  ) {
    this.selectEl = element as HTMLSelectElement;
    this.extraSettingsEl = element;
  }
  setButtonText(text: string) {
    this.element.textContent = text;
    return this;
  }
  setDisabled(value: boolean) {
    this.element.disabled = value;
    return this;
  }
  setPlaceholder(value: string) {
    (this.element as HTMLInputElement).placeholder = value;
    return this;
  }
  setValue(value: string) {
    this.element.value = value;
    return this;
  }
  setIcon(_value: string) {
    this.element.textContent = "⋮";
    return this;
  }
  setTooltip(value: string) {
    this.element.title = value;
    return this;
  }
  onClick(callback: () => void) {
    this.element.addEventListener("click", callback);
    return this;
  }
  onChange(callback: (value: string) => void) {
    this.element.addEventListener("change", () => callback(this.element.value));
    return this;
  }
}
export class Setting {
  settingEl: HTMLElement;
  nameEl: HTMLElement;
  descEl: HTMLElement;
  controlEl: HTMLElement;
  constructor(parent: HTMLElement) {
    this.settingEl = make(parent, "div", { cls: "setting-item" });
    const info = make(this.settingEl, "div", { cls: "setting-item-info" });
    this.nameEl = make(info, "div", { cls: "setting-item-name" });
    this.descEl = make(info, "div", { cls: "setting-item-description" });
    this.controlEl = make(this.settingEl, "div", {
      cls: "setting-item-control",
    });
  }
  setName(value: string) {
    this.nameEl.textContent = value;
    return this;
  }
  setDesc(value: string) {
    this.descEl.textContent = value;
    return this;
  }
  setClass(value: string) {
    this.settingEl.classList.add(value);
    return this;
  }
  setHeading() {
    this.settingEl.classList.add("setting-heading");
    return this;
  }
  addButton(callback: (control: Control) => void) {
    callback(new Control(make(this.controlEl, "button") as HTMLButtonElement));
    return this;
  }
  addExtraButton(callback: (control: Control) => void) {
    callback(
      new Control(
        make(this.controlEl, "button", {
          cls: "extra-setting-button",
        }) as HTMLButtonElement,
      ),
    );
    return this;
  }
  addDropdown(callback: (control: Control) => void) {
    callback(new Control(make(this.controlEl, "select") as HTMLSelectElement));
    return this;
  }
  addSearch(callback: (control: Control) => void) {
    callback(new Control(make(this.controlEl, "input") as HTMLInputElement));
    return this;
  }
}
export class Notice {
  constructor(message: string) {
    console.info(message);
  }
}
export class Modal {}
export class Menu {}
export const requireApiVersion = () => false;
export const Platform = { isMobile: false };
export const requestUrl = () => {
  throw Error("Preview transport is disabled");
};
