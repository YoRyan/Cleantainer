type Container = {
    cookieStoreId: string;
    name: string;
    icon: string;
    color: string;
};

const builtInContainers: Container[] = [
    {
        cookieStoreId: "firefox-default",
        name: "Default Container",
        icon: "default_no-container",
        color: "grey",
    },
    {
        cookieStoreId: "firefox-private",
        name: "Private Browsing",
        icon: "default_private",
        color: "purple",
    },
];
const confirmTimeoutMs = 3000;
const doneTimeoutMs = 1000;

async function popupMain() {
    const userContainers = (await browser.contextualIdentities.query(
        {},
    )) as Container[];
    const containers = builtInContainers.concat(userContainers);

    const list = document.querySelector("#container-list") as Element;
    const template = document.querySelector(
        "#container",
    ) as HTMLTemplateElement;

    for (const { cookieStoreId, name, color } of containers) {
        const cloned = template.content.cloneNode(true) as Element;

        const item = cloned.querySelector(".container") as HTMLElement;
        item.dataset.cookieStoreId = cookieStoreId;
        item.style.borderLeftColor = color;
        item.addEventListener("click", containerClickHandler);

        const nameElement = cloned.querySelector(".container-name") as Element;
        nameElement.innerHTML = name;

        list.appendChild(cloned);
    }
}

async function containerClickHandler(this: HTMLElement, ev: MouseEvent) {
    const { dataset } = this;
    const { confirmTimer, doneTimer } = dataset;
    if (confirmTimer) {
        clearTimeout(parseInt(confirmTimer));
        delete dataset.confirmTimer;
        dataset.inProgress = "";

        const { cookieStoreId } = dataset;
        await clearBrowsingData(cookieStoreId as string);

        dataset.doneTimer =
            "" +
            setTimeout(async () => {
                delete dataset.doneTimer;
            }, doneTimeoutMs);
        delete dataset.inProgress;
    } else {
        if (doneTimer) {
            clearTimeout(parseInt(doneTimer));
            delete dataset.doneTimer;
        }

        dataset.confirmTimer =
            "" +
            setTimeout(async () => {
                delete dataset.confirmTimer;
            }, confirmTimeoutMs);
    }
}

async function clearBrowsingData(cookieStoreId: string) {
    const options: browser.browsingData.RemovalOptions = {
        cookieStoreId,
        originTypes: {
            unprotectedWeb: true,
            protectedWeb: false,
            extension: false,
        },
    };
    return Promise.all([
        browser.browsingData.removeCookies(options),
        browser.browsingData.removeLocalStorage(options),
    ]);
}

popupMain();
