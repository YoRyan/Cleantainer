type Container = {
    cookieStoreId: string;
    name: string;
    icon: string;
    color: string;
};

type ControlState =
    | "load"
    | "ready"
    | { confirmTimer: number }
    | "inProgress"
    | { doneTimer: number }
    | "readyDone";

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

    for (const [i, { cookieStoreId, name, color }] of containers.entries()) {
        const cloned = template.content.cloneNode(true) as Element;

        const item = cloned.querySelector(".container") as HTMLElement;
        item.dataset.cookieStoreId = cookieStoreId;
        item.addEventListener("click", containerClickHandler);

        const nameElement = cloned.querySelector(
            ".container-name",
        ) as HTMLElement;
        nameElement.style.borderLeftColor = color;
        nameElement.innerHTML = name;

        list.appendChild(cloned);

        if (i === builtInContainers.length - 1) {
            list.appendChild(document.createElement("hr"));
        }
    }
}

async function containerClickHandler(this: HTMLElement, ev: MouseEvent) {
    const { dataset } = this;
    const current = readControlState(dataset);

    let next: ControlState;
    switch (current) {
        case "load":
        case "ready":
        case "readyDone":
            {
                const confirmTimer = setTimeout(
                    () => setControlState(dataset, "ready"),
                    confirmTimeoutMs,
                );
                next = { confirmTimer };
            }
            break;
        case "inProgress":
            next = "inProgress"; // Do nothing.
            break;
        default:
            if ("doneTimer" in current) {
                const { doneTimer } = current;
                clearTimeout(doneTimer);

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
                        () => setControlState(dataset, "readyDone"),
                        doneTimeoutMs,
                    );
                    setControlState(dataset, { doneTimer });
                })();

                next = "inProgress";
            }
    }
    setControlState(dataset, next);
}

function readControlState(dataset: DOMStringMap): ControlState {
    const { state, timer } = dataset;
    switch (state) {
        case "ready":
            return "ready";
        case "confirm":
            return { confirmTimer: parseInt(timer as string) };
        case "inProgress":
            return "inProgress";
        case "done":
            return { doneTimer: parseInt(timer as string) };
        case "readyDone":
            return "readyDone";
        default:
            return "load";
    }
}

function setControlState(dataset: DOMStringMap, cs: ControlState) {
    let state: string | undefined;
    let timer: number | undefined;
    switch (cs) {
        case "load":
            state = undefined;
            timer = undefined;
            break;
        case "ready":
            state = "ready";
            timer = undefined;
            break;
        case "inProgress":
            state = "inProgress";
            timer = undefined;
            break;
        case "readyDone":
            state = "readyDone";
            timer = undefined;
            break;
        default:
            if ("confirmTimer" in cs) {
                state = "confirm";
                timer = cs.confirmTimer;
            } else {
                state = "done";
                timer = cs.doneTimer;
            }
            break;
    }
    if (state !== undefined) {
        dataset.state = state;
    } else {
        delete dataset.state;
    }
    if (timer !== undefined) {
        dataset.timer = "" + timer;
    } else {
        delete dataset.timer;
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
