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

        if (i === builtInContainers.length) {
            list.appendChild(document.createElement("hr"));
        }

        list.appendChild(cloned);
    }
}

async function containerClickHandler(this: HTMLElement, ev: MouseEvent) {
    const current = readControlState(this);

    let next: ControlState;
    switch (current) {
        case "load":
        case "ready":
        case "readyDone":
            {
                const confirmTimer = setTimeout(
                    () => setControlState(this, "ready"),
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
                    () => setControlState(this, "ready"),
                    confirmTimeoutMs,
                );
                next = { confirmTimer };
            } else {
                const { confirmTimer } = current;
                clearTimeout(confirmTimer);

                (async () => {
                    const { cookieStoreId } = this.dataset;
                    await clearBrowsingData(cookieStoreId as string);
                    const doneTimer = setTimeout(
                        () => setControlState(this, "readyDone"),
                        doneTimeoutMs,
                    );
                    setControlState(this, { doneTimer });
                })();

                next = "inProgress";
            }
    }
    setControlState(this, next);
}

function readControlState(el: HTMLElement): ControlState {
    const { state, timer } = el.dataset;
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

function setControlState(el: HTMLElement, cs: ControlState) {
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

    const { dataset } = el;
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
