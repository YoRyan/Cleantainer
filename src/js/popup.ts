import { findValue, sortByMap, partition } from "./arrays.js";
import { cleanContainer } from "./browsing-data.js";
import { readLocalOptions, writeLocalOptions } from "./storage.js";

type CleanerState =
    | "load"
    | "ready"
    | { confirmTimer: number }
    | "inProgress"
    | { doneTimer: number }
    | "readyDone"
    | { errorTimer: number }
    | "readyError";

const confirmTimeoutMs = 3000;
const doneTimeoutMs = 1000;

let draggedCleaner: CleanerElement | undefined = undefined;

async function popupMain() {
    const options = await readLocalOptions();
    const { uiDensity, pinnedIds } = options;

    const list = document.querySelector("#cleaner-list") as HTMLElement;
    list.classList.add("ui-density-" + uiDensity);
    const template = document.querySelector("#cleaner") as HTMLTemplateElement;

    const [userContainers, [currentTab]] = await Promise.all([
        browser.contextualIdentities.query({}),
        browser.tabs.query({ active: true, currentWindow: true }),
    ]);
    const currentStore = currentTab?.cookieStoreId;

    // Create any built-in containers.
    list.append(
        ...[
            {
                cookieStoreId: "firefox-default",
                current: currentStore === "firefox-default",
                name: browser.i18n.getMessage("containerDefault"),
                icon: "default_no-container",
                color: "toolbar",
                pinOrder: findValue(pinnedIds, "firefox-default"),
                queryOrder: undefined,
            },
            {
                cookieStoreId: "firefox-private",
                current: currentStore === "firefox-private",
                name: browser.i18n.getMessage("containerPrivate"),
                icon: "default_private",
                color: "purple",
                pinOrder: findValue(pinnedIds, "firefox-private"),
                queryOrder: undefined,
            },
        ].map(attr => createCleanerElement(template, attr)),
    );

    // Create all user containers.
    list.append(
        ...userContainers
            .entries()
            .map(([i, ci]) => {
                const { cookieStoreId, name, icon, color } = ci;
                return {
                    cookieStoreId,
                    current: currentStore === cookieStoreId,
                    name,
                    icon,
                    color,
                    pinOrder: findValue(pinnedIds, cookieStoreId),
                    queryOrder: i,
                };
            })
            .map(attr => createCleanerElement(template, attr)),
    );

    orderCleaners();

    const openOptions = document.querySelector("#popup-options") as HTMLElement;
    openOptions.addEventListener("click", async ev => {
        await browser.runtime.openOptionsPage();
        close();
    });
}

function createCleanerElement(
    template: HTMLTemplateElement,
    attr: {
        cookieStoreId: string;
        current: boolean;
        name: string;
        icon: string;
        color: string;
        pinOrder: number | undefined;
        queryOrder: number | undefined;
    },
) {
    const { cookieStoreId, current, name, icon, color, pinOrder, queryOrder } =
        attr;
    const isPrivate = cookieStoreId === "firefox-private";

    const fragment = template.content.cloneNode(true) as Element;
    const cleaner = fragment.querySelector(".cleaner") as CleanerElement;
    cleaner.dataset.cookieStoreId = cookieStoreId;
    if (current) {
        cleaner.dataset.current = "";
    }
    if (pinOrder !== undefined) {
        cleaner.dataset.pinOrder = "" + pinOrder;
        cleaner.draggable = true;
    }
    if (queryOrder !== undefined) {
        cleaner.dataset.queryOrder = "" + queryOrder;
    }
    cleaner.addEventListener("dragstart", ev => {
        draggedCleaner = ev.target as CleanerElement;
    });
    cleaner.addEventListener("dragover", ev => {
        ev.preventDefault();
    });
    cleaner.addEventListener("drop", async ev =>
        cleaner.dropCleanerHandler(ev),
    );

    const button = cleaner.querySelector(".cleaner-button") as HTMLElement;
    button.title = browser.i18n.getMessage(
        isPrivate ? "popupCleanPrivateTooltip" : "popupCleanTooltip",
    );
    button.addEventListener("click", async ev =>
        cleaner.cleanerClickHandler(ev),
    );

    const pin = cleaner.querySelector(".cleaner-pin") as HTMLElement;
    pin.addEventListener("click", async ev => cleaner.pinClickHandler(ev));

    const iconElement = fragment.querySelector(
        ".container-icon",
    ) as HTMLElement;
    iconElement.dataset.identityIcon = icon;
    iconElement.dataset.identityColor = color;

    const nameElement = fragment.querySelector(".cleaner-name") as HTMLElement;
    nameElement.innerText = name;
    if (isPrivate) {
        nameElement.appendChild(document.createTextNode(" "));

        const icon = document.createElement("span");
        icon.className = "cookie-icon";
        nameElement.appendChild(icon);
    }

    return cleaner;
}

class CleanerElement extends HTMLLIElement {
    constructor() {
        super();
    }

    async cleanerClickHandler(ev: MouseEvent) {
        const current = this.readState();

        let next: CleanerState;
        if (current === "inProgress") {
            // Do nothing.
            next = "inProgress";
        } else {
            const isTimer = typeof current === "object";
            if (isTimer) {
                // Cancel the scheduled timer.
                let scheduled: number;
                if ("confirmTimer" in current) {
                    scheduled = current.confirmTimer;
                } else if ("doneTimer" in current) {
                    scheduled = current.doneTimer;
                } else {
                    scheduled = current.errorTimer;
                }
                clearTimeout(scheduled);
            }
            if (isTimer && "confirmTimer" in current) {
                // The confirm state is the only one in which we want to perform a clean operation.
                this.executeClean();
                next = "inProgress";
            } else {
                // Otherwise, transition to the user confirmation state.
                const confirmTimer = setTimeout(
                    () => this.setState("ready"),
                    confirmTimeoutMs,
                );
                next = { confirmTimer };
            }
        }
        this.setState(next);
    }

    private async executeClean() {
        const { cookieStoreId } = this.dataset;
        let error: unknown;
        try {
            await cleanContainer(cookieStoreId as string);
        } catch (e) {
            error = e;
        }

        if (error === undefined) {
            const doneTimer = setTimeout(
                () => this.setState("readyDone"),
                doneTimeoutMs,
            );
            this.setState({ doneTimer });
        } else {
            console.error(
                `Error clearing cookieStoreId "${cookieStoreId}":`,
                error,
            );

            const errorTimer = setTimeout(
                () => this.setState("readyError"),
                doneTimeoutMs,
            );
            this.setState({ errorTimer });
        }
    }

    readState(): CleanerState {
        const { state, timer } = this.dataset;
        const timerP = parseInt(timer as string);
        switch (state) {
            case "ready":
                return "ready";
            case "confirm":
                return { confirmTimer: timerP };
            case "inProgress":
                return "inProgress";
            case "done":
                return { doneTimer: timerP };
            case "readyDone":
                return "readyDone";
            case "error":
                return { errorTimer: timerP };
            case "readyError":
                return "readyError";
            default:
                return "load";
        }
    }

    setState(cs: CleanerState) {
        let state: string | undefined, timer: number | undefined;
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
            case "readyError":
                state = "readyError";
                timer = undefined;
                break;
            default:
                if ("confirmTimer" in cs) {
                    state = "confirm";
                    timer = cs.confirmTimer;
                } else if ("doneTimer" in cs) {
                    state = "done";
                    timer = cs.doneTimer;
                } else {
                    state = "error";
                    timer = cs.errorTimer;
                }
                break;
        }

        const { dataset } = this;
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

    async dropCleanerHandler(ev: Event) {
        ev.preventDefault();

        const isPin = "pinOrder" in this.dataset;
        if (!isPin || draggedCleaner === undefined) {
            return;
        }

        {
            const { pinOrder } = draggedCleaner.dataset;
            draggedCleaner.dataset.pinOrder = this.dataset.pinOrder;
            this.dataset.pinOrder = pinOrder;
        }

        const draggedId = draggedCleaner.dataset.cookieStoreId;
        // Stop this handler from running again while reading storage.
        draggedCleaner = undefined;
        orderCleaners();

        let options = await readLocalOptions(),
            { pinnedIds } = options;
        // These casts can fail, but nbd if they do---we'll just not save.
        const draggedIdx = findValue(pinnedIds, draggedId) as number;
        const thisIdx = findValue(
            pinnedIds,
            this.dataset.cookieStoreId,
        ) as number;
        {
            const x = pinnedIds[draggedIdx];
            pinnedIds[draggedIdx] = pinnedIds[thisIdx];
            pinnedIds[thisIdx] = x;
        }
        await writeLocalOptions(options);
    }

    async pinClickHandler(ev: MouseEvent) {
        let options = await readLocalOptions(),
            pinnedIds: string[];

        const { dataset } = this;
        const cookieStoreId = dataset.cookieStoreId as string;
        if ("pinOrder" in dataset) {
            // unpin
            pinnedIds = options.pinnedIds.filter(v => v !== cookieStoreId);
            delete dataset.pinOrder;
            this.draggable = false;
        } else {
            // pin
            pinnedIds = [...options.pinnedIds, cookieStoreId];
            dataset.pinOrder = "" + Number.MAX_SAFE_INTEGER; // For now, insert at the end.
            this.draggable = true;
        }

        fixPinOrder();
        orderCleaners();

        options.pinnedIds = pinnedIds;
        await writeLocalOptions(options);
    }
}
customElements.define("popup-cleaner", CleanerElement, { extends: "li" });

function fixPinOrder() {
    const list = document.querySelector("#cleaner-list") as HTMLElement;
    const all = Array.from(list.querySelectorAll("li")) as CleanerElement[];
    const pinned = all.filter(ce => "pinOrder" in ce.dataset);
    sortByMap(pinned, ce => parseInt(ce.dataset.pinOrder as string))
        .entries()
        .forEach(([i, ce]) => {
            ce.dataset.pinOrder = "" + i;
        });
}

function orderCleaners() {
    const list = document.querySelector("#cleaner-list") as HTMLElement;
    const all = Array.from(list.querySelectorAll("li")) as CleanerElement[];

    // Clear out all existing dividers.
    list.querySelectorAll("hr").forEach(hr => hr.remove());

    // Hack to avoid replaying CSS animations.
    all.filter(ce => {
        switch (ce.readState()) {
            case "ready":
            case "readyDone":
                return true;
            default:
                return false;
        }
    }).forEach(ce => ce.setState("load"));

    // Place pinned containers first.
    const [pinned, notPinned] = partition(all, ce => "pinOrder" in ce.dataset);
    list.append(
        ...sortByMap(pinned, ce => parseInt(ce.dataset.pinOrder as string)),
    );

    if (pinned.length > 0 && notPinned.length > 0) {
        const hr = document.createElement("hr");
        hr.id = "divider-pinned";
        list.appendChild(hr);
    }

    // Next, built-in containers that aren't pinned.
    const [user, builtIn] = partition(
        notPinned,
        ce => "queryOrder" in ce.dataset,
    );
    list.append(...sortByMap(builtIn, ce => ce.innerText));

    if (builtIn.length > 0 && user.length > 0) {
        const hr = document.createElement("hr");
        hr.id = "divider-user";
        list.appendChild(hr);
    }

    // Finally, user containers that aren't pinned.
    list.append(
        ...sortByMap(user, ce => parseInt(ce.dataset.queryOrder as string)),
    );

    // Set tooltips based on the pinned state.
    pinned.forEach(ce => {
        const pin = ce.querySelector(".cleaner-pin") as HTMLElement;
        pin.title = browser.i18n.getMessage("popupUnpinTooltip");
    });
    notPinned.forEach(ce => {
        const pin = ce.querySelector(".cleaner-pin") as HTMLElement;
        pin.title = browser.i18n.getMessage("popupPinTooltip");
    });
}

popupMain();
