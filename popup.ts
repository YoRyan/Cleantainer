type Container = {
    cookieStoreId: string;
    name: string;
    icon: string;
    color: string;
};

type ControlState =
    | "ready"
    | { confirmTimer: number }
    | "inProgress"
    | { doneTimer: number };

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
    const current = readControlState(dataset);

    let next: ControlState;
    if (current === "inProgress") {
        next = "inProgress"; // Do nothing.
    } else if (current === "ready" || "doneTimer" in current) {
        if (current !== "ready") {
            const { doneTimer } = current;
            clearTimeout(doneTimer);
        }

        const confirmTimer = setTimeout(
            () => setControlState(dataset, "ready"),
            confirmTimeoutMs,
        );
        next = { confirmTimer };
    } else {
        const { confirmTimer } = current;
        clearTimeout(confirmTimer);

        (async () => {
            const { cookieStoreId } = dataset;
            await clearBrowsingData(cookieStoreId as string);
            const doneTimer = setTimeout(
                () => setControlState(dataset, "ready"),
                doneTimeoutMs,
            );
            setControlState(dataset, { doneTimer });
        })();

        next = "inProgress";
    }
    setControlState(dataset, next);
}

function readControlState(dataset: DOMStringMap): ControlState {
    const { confirmTimer, doneTimer, inProgress } = dataset;
    if (confirmTimer) {
        return { confirmTimer: parseInt(confirmTimer) };
    } else if (doneTimer) {
        return { doneTimer: parseInt(doneTimer) };
    } else if (inProgress) {
        return "inProgress";
    } else {
        return "ready";
    }
}

function setControlState(dataset: DOMStringMap, state: ControlState) {
    if (state === "ready") {
        delete dataset.confirmTimer;
        delete dataset.doneTimer;
        delete dataset.inProgress;
    } else if (state === "inProgress") {
        delete dataset.confirmTimer;
        delete dataset.doneTimer;
        dataset.inProgress = "";
    } else if ("confirmTimer" in state) {
        dataset.confirmTimer = "" + state.confirmTimer;
        delete dataset.doneTimer;
        delete dataset.inProgress;
    } else {
        delete dataset.confirmTimer;
        dataset.doneTimer = "" + state.doneTimer;
        delete dataset.inProgress;
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
