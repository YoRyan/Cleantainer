import {
    readExtensionShortcuts,
    readLocalOptions,
    readOptions,
    writeExtensionShortcuts,
    writeLocalOptions,
} from "./storage.js";

async function optionsMain() {
    setupShortcutsSection();
    setupShortcutsDescription();
    setupImportExport();
}

async function setupShortcutsSection() {
    // Initialize container metadata and attach event listeners.
    const ci = await browser.contextualIdentities.query({});
    const fieldset = document.querySelector("#clean-shortcut") as HTMLElement;

    const defaultChecked = fieldset.querySelector(
        "[data-cookie-store-id='firefox-default']",
    ) as HTMLInputElement;
    defaultChecked.addEventListener("change", containerCheckboxHandler);

    const privateChecked = fieldset.querySelector(
        "[data-cookie-store-id='firefox-private']",
    ) as HTMLInputElement;
    privateChecked.addEventListener("change", containerCheckboxHandler);

    const template = document.querySelector(
        "#clean-shortcut-container",
    ) as HTMLTemplateElement;
    const parent = fieldset.querySelector("ul") as Element;
    const insertBefore = fieldset.querySelector(
        ".divider-regex",
    ) as HTMLElement;
    for (const { cookieStoreId, name, icon, color } of ci) {
        const cloned = template.content.cloneNode(true) as Element;

        const label = cloned.querySelector("label") as HTMLElement;
        const checkboxId = "container-enable_" + cookieStoreId;
        label.setAttribute("for", checkboxId);

        const checkbox = cloned.querySelector("input") as HTMLInputElement;
        checkbox.id = checkboxId;
        checkbox.dataset.cookieStoreId = cookieStoreId;
        checkbox.addEventListener("change", containerCheckboxHandler);

        const iconElement = cloned.querySelector(
            ".container-icon",
        ) as HTMLElement;
        iconElement.dataset.identityIcon = icon;
        iconElement.dataset.identityColor = color;

        const nameElement = cloned.querySelector(
            ".container-name",
        ) as HTMLElement;
        nameElement.innerText = name;

        parent.insertBefore(cloned, insertBefore);
    }

    const regexChecked = fieldset.querySelector(
        "#regex-enable",
    ) as HTMLInputElement;
    regexChecked.addEventListener("change", regexCheckboxHandler);

    const regexInput = fieldset.querySelector(
        "#regex-input",
    ) as HTMLTextAreaElement;
    regexInput.addEventListener("change", regexTextareaHandler);

    // Attach event listener to shortcut select menu.
    const select = document.querySelector(
        "#clean-shortcut-select",
    ) as HTMLSelectElement;
    select.addEventListener("change", shortcutSelectHandler);

    // Initialize the input element states to be consistent with storage.
    await setShortcutsSectionForIndex(getSelectedShortcutIndex());
}

async function containerCheckboxHandler(this: HTMLInputElement, ev: Event) {
    const idx = getSelectedShortcutIndex();
    let options = await readLocalOptions(),
        shortcut = options.shortcuts[idx];

    const { cookieStoreId } = this.dataset;
    const { checked } = this;
    switch (cookieStoreId) {
        case "firefox-default":
            shortcut.defaultContainer = checked;
            break;
        case "firefox-private":
            shortcut.privateContainer = checked;
            break;
        case undefined:
            break;
        default:
            const ucSet = new Set(shortcut.userContainerIds);
            if (checked) {
                ucSet.add(cookieStoreId);
            } else {
                ucSet.delete(cookieStoreId);
            }
            shortcut.userContainerIds = Array.from(ucSet);
            break;
    }
    await writeLocalOptions(options);
}

async function regexCheckboxHandler(this: HTMLInputElement, ev: Event) {
    const idx = getSelectedShortcutIndex();
    let options = await readLocalOptions(),
        shortcut = options.shortcuts[idx];

    const { checked } = this;
    shortcut.userContainerNames.enabled = checked;

    const regexInput = document.querySelector(
        "#regex-input",
    ) as HTMLTextAreaElement;
    regexInput.disabled = !checked;

    await writeLocalOptions(options);
}

async function regexTextareaHandler(this: HTMLTextAreaElement, ev: Event) {
    const idx = getSelectedShortcutIndex();
    let options = await readLocalOptions(),
        shortcut = options.shortcuts[idx];

    shortcut.userContainerNames.regex = this.value;

    await writeLocalOptions(options);
}

async function shortcutSelectHandler(this: HTMLSelectElement, ev: Event) {
    const idx = parseInt(this.value) - 1;
    await setShortcutsSectionForIndex(idx);
}

function getSelectedShortcutIndex() {
    const select = document.querySelector(
        "#clean-shortcut-select",
    ) as HTMLSelectElement;
    return parseInt(select.value) - 1;
}

async function setShortcutsSectionForIndex(idx: number) {
    const options = await readLocalOptions();
    const shortcut = options.shortcuts[idx];
    const ucSet = new Set(shortcut.userContainerIds);

    const fieldset = document.querySelector("#clean-shortcut") as HTMLElement;
    const containerCheckboxes = fieldset.querySelectorAll(
        ".container-enable",
    ) as NodeListOf<HTMLInputElement>;
    for (const checkbox of containerCheckboxes) {
        const { cookieStoreId } = checkbox.dataset;
        let checked: boolean;
        switch (cookieStoreId) {
            case "firefox-default":
                checked = shortcut.defaultContainer;
                break;
            case "firefox-private":
                checked = shortcut.privateContainer;
                break;
            default:
                checked = ucSet.has(cookieStoreId as string);
                break;
        }
        checkbox.checked = checked;
    }

    const regexEnable = shortcut.userContainerNames.enabled;
    const regexCheckbox = fieldset.querySelector(
        "#regex-enable",
    ) as HTMLInputElement;
    regexCheckbox.checked = regexEnable;

    const regexInput = fieldset.querySelector(
        "#regex-input",
    ) as HTMLTextAreaElement;
    regexInput.disabled = !regexEnable;
    regexInput.value = shortcut.userContainerNames.regex;
}

function setupShortcutsDescription() {
    const separator = "SHORTCUTS_ANCHOR_HERE";
    const [before, after] = browser.i18n
        .getMessage("cleanShortcutDescription", separator)
        .split(separator, 2);

    const openSettings = document.createElement("a");
    openSettings.href = "#";
    openSettings.addEventListener("click", async ev =>
        // @ts-ignore
        browser.commands.openShortcutSettings(),
    );
    openSettings.appendChild(
        document.createTextNode(
            browser.i18n.getMessage("cleanShortcutDescriptionShortcutAnchor"),
        ),
    );

    const p = document.querySelector(
        "#clean-shortcut-description",
    ) as HTMLElement;
    p.append(
        document.createTextNode(before),
        openSettings,
        document.createTextNode(after),
    );
}

function setupImportExport() {
    const importButton = document.querySelector("#import-json") as HTMLElement;
    importButton.addEventListener("click", importJsonClickHandler);

    const importPicker = document.querySelector(
        "#import-json-picker",
    ) as HTMLInputElement;
    importPicker.addEventListener("change", importJsonChangeHandler);

    const exportButton = document.querySelector("#export-json") as HTMLElement;
    exportButton.addEventListener("click", exportJsonClickHandler);
}

async function importJsonClickHandler(this: HTMLElement, ev: Event) {
    const picker = document.querySelector(
        "#import-json-picker",
    ) as HTMLInputElement;
    picker.showPicker();
}

async function importJsonChangeHandler(this: HTMLInputElement, ev: Event) {
    const fileList = this.files as FileList;
    if (fileList.length < 1) {
        return;
    }

    notJson: do {
        const [file] = fileList;
        if (file.type !== "application/json") {
            break notJson;
        }

        let json: object;
        try {
            json = JSON.parse(await file.text());
        } catch {
            break notJson;
        }

        if (typeof json !== "object" || !("options" in json)) {
            break notJson;
        }

        const options = readOptions(json.options);
        await writeLocalOptions(options);

        if ("shortcuts" in json) {
            const { shortcuts } = json;
            if (typeof shortcuts === "object" && shortcuts !== null) {
                await writeExtensionShortcuts(
                    shortcuts as { [k: string]: string }, // Not a big deal if this cast fails.
                );
            }
        }

        alert(browser.i18n.getMessage("importFromFileSuccessful", file.name));

        // Make controls reflect the restored settings.
        await setShortcutsSectionForIndex(getSelectedShortcutIndex());

        return;
    } while (false);
    alert(browser.i18n.getMessage("importErrorNotJson"));
}

async function exportJsonClickHandler(this: HTMLElement, ev: Event) {
    const json = {
        options: await readLocalOptions(),
        shortcuts: await readExtensionShortcuts(),
    };
    const url = URL.createObjectURL(
        new Blob([JSON.stringify(json, null, 2)], { type: "application/json" }),
    );

    const a = document.createElement("a");
    a.href = url;
    a.download = browser.i18n.getMessage("exportFilename", ".json");
    a.click();

    URL.revokeObjectURL(url);
    a.remove();
}

class ShortcutSelect extends HTMLSelectElement {
    constructor() {
        super();
    }

    async connectedCallback() {
        const commands = await browser.commands.getAll();
        const unassigned = browser.i18n.getMessage(
            "cleanShortcutSelectUnassigned",
        );
        const shortcuts = new Map<string, string>(
            commands.map(c => [c.name as string, c.shortcut || unassigned]),
        );
        const options = this.querySelectorAll("option");
        options.forEach(o => {
            const i = o.value;
            const message = "cleanShortcutSelect" + i;
            const shortcut = shortcuts.get("clean-shortcut-" + i) as string;
            o.textContent = browser.i18n.getMessage(message, [shortcut]);
        });
    }
}
customElements.define("shortcut-select", ShortcutSelect, { extends: "select" });

optionsMain();
