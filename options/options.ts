import { readLocalOptions, writeLocalOptions } from "../common/storage.js";

async function optionsMain() {
    const userContainers = await browser.contextualIdentities.query({});
    const initial = await readLocalOptions();
    const i = 0;
    const list = initial.quickLists[i];

    const fieldset = document.querySelector(
        "#quick-list-1",
    ) as HTMLFieldSetElement;
    const checkboxHandler = async function (this: HTMLInputElement, ev: Event) {
        return containerCheckboxHandler.call(this, ev, i);
    };
    {
        const dfault = fieldset.querySelector(
            "[data-cookie-store-id='firefox-default']",
        ) as HTMLInputElement;
        dfault.checked = list.defaultContainer;

        const pvate = fieldset.querySelector(
            "[data-cookie-store-id='firefox-private']",
        ) as HTMLInputElement;
        pvate.checked = list.privateContainer;

        const regex = fieldset.querySelector(
            ".regex-enable",
        ) as HTMLInputElement;
        regex.checked = list.userContainerNames.enabled;

        [dfault, pvate, regex].forEach(input =>
            input.addEventListener("change", checkboxHandler),
        );
    }

    {
        const template = document.querySelector(
            "#quick-list-container",
        ) as HTMLTemplateElement;
        const insertBefore = fieldset.querySelector(
            "ul li:last-child",
        ) as HTMLLIElement;
        const ucSet = new Set(list.userContainerIds);
        for (const { cookieStoreId, name, color } of userContainers) {
            const cloned = template.content.cloneNode(true) as Element;

            const checkbox = cloned.querySelector("input") as HTMLInputElement;
            checkbox.dataset.cookieStoreId = cookieStoreId;
            checkbox.checked = ucSet.has(cookieStoreId);
            checkbox.addEventListener("change", checkboxHandler);

            const nameElement = cloned.querySelector(
                ".container-name",
            ) as HTMLSpanElement;
            nameElement.style.borderLeftColor = color;
            nameElement.innerText = name;

            insertBefore.parentNode?.insertBefore(cloned, insertBefore);
        }
    }

    {
        const input = fieldset.querySelector(
            ".regex-input",
        ) as HTMLTextAreaElement;
        const changeHandler = async function (
            this: HTMLTextAreaElement,
            ev: Event,
        ) {
            return regexTextareaHandler.call(this, ev, i);
        };
        input.value = list.userContainerNames.regex;
        input.addEventListener("change", changeHandler);
    }
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
            (checked ? ucSet.add : ucSet.delete)(cookieStoreId);
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

optionsMain();
