async function optionsMain() {
    const userContainers = await browser.contextualIdentities.query({});
    const quickList = document.querySelector(
        "#quick-list-1",
    ) as HTMLFieldSetElement;
    populateList(quickList, userContainers);
}

async function populateList(
    fieldset: HTMLFieldSetElement,
    ci: browser.contextualIdentities.ContextualIdentity[],
) {
    const template = document.querySelector(
        "#quick-list-container",
    ) as HTMLTemplateElement;
    const insertBefore = fieldset.querySelector(
        "ul li:last-child",
    ) as HTMLLIElement;

    for (const { cookieStoreId, name, color } of ci) {
        const cloned = template.content.cloneNode(true) as Element;

        const checkbox = cloned.querySelector("input") as HTMLInputElement;
        checkbox.dataset.cookieStoreId = cookieStoreId;

        const nameElement = cloned.querySelector(
            ".container-name",
        ) as HTMLSpanElement;
        nameElement.style.borderLeftColor = color;
        nameElement.innerText = name;

        insertBefore.parentNode?.insertBefore(cloned, insertBefore);
    }
}

optionsMain();
