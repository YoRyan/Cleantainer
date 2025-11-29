import {
    Options,
    readLocalOptions,
    readOptions,
    writeLocalOptions,
} from "../common/storage.js";

async function optionsMain() {
    const options = await readLocalOptions();
    const ci = await browser.contextualIdentities.query({});
    setupQuickList(options, ci, 0);
    setupImportExport();
}

function setupQuickList(
    options: Options,
    ci: browser.contextualIdentities.ContextualIdentity[],
    n: number,
) {
    const ql = options.quickLists[n];
    const fieldset = document.querySelector(
        "#quick-list-" + (n + 1),
    ) as HTMLElement;
    const checkboxHandler = async function (this: HTMLInputElement, ev: Event) {
        return containerCheckboxHandler.call(this, ev, n);
    };

    const defaultChecked = fieldset.querySelector(
        "[data-cookie-store-id='firefox-default']",
    ) as HTMLInputElement;
    defaultChecked.checked = ql.defaultContainer;
    defaultChecked.addEventListener("change", checkboxHandler);

    const privateChecked = fieldset.querySelector(
        "[data-cookie-store-id='firefox-private']",
    ) as HTMLInputElement;
    privateChecked.checked = ql.privateContainer;
    privateChecked.addEventListener("change", checkboxHandler);

    const template = document.querySelector(
        "#quick-list-container",
    ) as HTMLTemplateElement;
    const parent = fieldset.querySelector("ul") as Element;
    const insertBefore = fieldset.querySelector(
        ".divider-regex",
    ) as HTMLElement;
    const ucSet = new Set(ql.userContainerIds);
    for (const { cookieStoreId, name, icon, color } of ci) {
        const cloned = template.content.cloneNode(true) as Element;

        const checkbox = cloned.querySelector("input") as HTMLInputElement;
        checkbox.dataset.cookieStoreId = cookieStoreId;
        checkbox.checked = ucSet.has(cookieStoreId);
        checkbox.addEventListener("change", checkboxHandler);

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

    const regexInput = fieldset.querySelector(
        ".regex-input",
    ) as HTMLTextAreaElement;
    const regexHandler = async function (this: HTMLTextAreaElement, ev: Event) {
        return regexTextareaHandler.call(this, ev, n);
    };
    regexInput.value = ql.userContainerNames.regex;
    regexInput.disabled = !ql.userContainerNames.enabled;
    regexInput.addEventListener("change", regexHandler);

    const regexChecked = fieldset.querySelector(
        ".regex-enable",
    ) as HTMLInputElement;
    regexChecked.checked = ql.userContainerNames.enabled;
    const regexCheckedHandler = async function (
        this: HTMLInputElement,
        ev: Event,
    ) {
        regexInput.disabled = !this.checked;
        await containerCheckboxHandler.call(this, ev, n);
    };
    regexChecked.addEventListener("change", regexCheckedHandler);
}

async function containerCheckboxHandler(
    this: HTMLInputElement,
    ev: Event,
    idx: number,
) {
    const options = await readLocalOptions();
    const list = options.quickLists[idx];

    const { cookieStoreId } = this.dataset;
    const { checked } = this;
    switch (cookieStoreId) {
        case "firefox-default":
            list.defaultContainer = checked;
            break;
        case "firefox-private":
            list.privateContainer = checked;
            break;
        case undefined: // regex enable/disable
            list.userContainerNames.enabled = checked;
            break;
        default: // user container
            const ucSet = new Set(list.userContainerIds);
            if (checked) {
                ucSet.add(cookieStoreId);
            } else {
                ucSet.delete(cookieStoreId);
            }
            list.userContainerIds = Array.from(ucSet);
            break;
    }
    await writeLocalOptions(options);
}

async function regexTextareaHandler(
    this: HTMLTextAreaElement,
    ev: Event,
    idx: number,
) {
    const options = await readLocalOptions();

    const list = options.quickLists[idx];
    list.userContainerNames.regex = this.value;

    await writeLocalOptions(options);
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

        const options = readOptions(json);
        await writeLocalOptions(options);
        return;
    } while (false);
    alert(browser.i18n.getMessage("importErrorNotJson"));
}

async function exportJsonClickHandler(this: HTMLElement, ev: Event) {
    const json = JSON.stringify(await readLocalOptions(), null, 2);
    const url = URL.createObjectURL(
        new Blob([json], { type: "application/json" }),
    );

    const a = document.createElement("a");
    a.href = url;
    a.download = browser.i18n.getMessage("exportFilename") + ".json";
    a.click();

    URL.revokeObjectURL(url);
    a.remove();
}

optionsMain();
