type Container = {
    cookieStoreId: string;
    name: string;
    icon: string;
    color: string;
};
type ClearRange =
    | "lastHour"
    | "lastTwoHours"
    | "lastFourHours"
    | "sinceMidnight"
    | "everything";
type LocalStorage = {
    clearRange: ClearRange;
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
const clearSince: { [ClearRange: string]: () => number } = {
    lastHour: minutesAgo(60),
    lastTwoHours: minutesAgo(120),
    lastFourHours: minutesAgo(240),
    sinceMidnight: () => {
        const d = new Date();
        d.setHours(0);
        d.setMinutes(0);
        d.setSeconds(0);
        d.setMilliseconds(0);
        return d.getTime();
    },
    everything: () => 0,
};
const confirmTimeoutMs = 3000;
const doneTimeoutMs = 1000;

function minutesAgo(mins: number) {
    return () => new Date().getTime() - mins * 60 * 1000;
}

async function main() {
    const { clearRange } = await readLocalStorage();
    for (const key of Object.keys(clearSince)) {
        const radio = document.getElementById(
            "clear-range-" + key,
        ) as HTMLInputElement;
        radio.checked = key === clearRange;
        radio.addEventListener("click", rangeClickHandler);
    }

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

async function readLocalStorage(): Promise<LocalStorage> {
    const storage = await browser.storage.local.get(null);
    const clearRange = storage !== undefined ? storage.clearRange : undefined;
    switch (clearRange) {
        case "lastHour":
        case "lastTwoHours":
        case "lastFourHours":
        case "sinceMidnight":
        case "everything":
            return { clearRange };
        default:
            return { clearRange: "lastHour" };
    }
}

async function rangeClickHandler(this: HTMLElement, ev: MouseEvent) {
    const clearRange = this.id.replace(/^clear-range-/, "");
    await browser.storage.local.set({ clearRange });
}

async function containerClickHandler(this: HTMLElement, ev: MouseEvent) {
    const { dataset } = this;
    const { confirmTimer, doneTimer } = dataset;
    if (confirmTimer) {
        clearTimeout(parseInt(confirmTimer));
        delete dataset.confirmTimer;
        dataset.inProgress = "";

        const { cookieStoreId } = dataset;
        const { clearRange } = await readLocalStorage();
        await clearBrowsingData(
            cookieStoreId as string,
            clearSince[clearRange](),
        );

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

async function clearBrowsingData(cookieStoreId: string, since: number) {
    const options: browser.browsingData.RemovalOptions = {
        cookieStoreId,
        since,
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

main();
