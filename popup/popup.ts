import { findValue, sortMap, subdivide } from "../common/arrays.js";
import { cleanContextualIdentity } from "../common/browsing-data.js";
import { readLocalOptions, writeLocalOptions } from "../common/storage.js";

type CleanerState =
    | "load"
    | "ready"
    | { confirmTimer: number }
    | "inProgress"
    | { doneTimer: number }
    | "readyDone";

type CleanerElement = HTMLLIElement;

const confirmTimeoutMs = 3000;
const doneTimeoutMs = 1000;

async function popupMain() {
    const options = await readLocalOptions();
    const { pinnedIds } = options;

    const list = document.querySelector("#cleaner-list") as HTMLElement;
    const template = document.querySelector("#cleaner") as HTMLTemplateElement;

    // Create any built-in containers.
    list.append(
        ...[
            {
            cookieStoreId: "firefox-default",
            name: browser.i18n.getMessage("containerDefault"),
            icon: "default_no-container",
            color: "gray",
            pinOrder: findValue(pinnedIds, "firefox-default"),
            queryOrder: undefined,
            },
            {
            cookieStoreId: "firefox-private",
            name: browser.i18n.getMessage("containerPrivate"),
            icon: "default_private",
            color: "purple",
            pinOrder: findValue(pinnedIds, "firefox-private"),
            queryOrder: undefined,
            },
        ].map(attr => createCleanerElement(template, attr)),
    );

    // Create all user containers.
    const userContainers = await browser.contextualIdentities.query({});
    list.append(
        ...userContainers
        .entries()
        .map(([i, ci]) => {
            const { cookieStoreId, name, icon, color } = ci;
            return {
                cookieStoreId,
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
}

function createCleanerElement(
    template: HTMLTemplateElement,
    attr: {
        cookieStoreId: string;
        name: string;
        icon: string;
        color: string;
        pinOrder: number | undefined;
        queryOrder: number | undefined;
    },
) {
    const { cookieStoreId, name, icon, color, pinOrder, queryOrder } = attr;

    const fragment = template.content.cloneNode(true) as Element;
    const cleaner = fragment.querySelector(".cleaner") as CleanerElement;
    cleaner.dataset.cookieStoreId = cookieStoreId;
    if (pinOrder !== undefined) {
        cleaner.dataset.pinOrder = "" + pinOrder;
    }
    if (queryOrder !== undefined) {
        cleaner.dataset.queryOrder = "" + queryOrder;
    }

    const button = cleaner.querySelector(".cleaner-button") as HTMLElement;
    button.addEventListener("click", async ev =>
        cleanerClickHandler.call(cleaner, ev),
    );

    const pin = cleaner.querySelector(".cleaner-pin") as HTMLElement;
    pin.addEventListener("click", async ev =>
        pinClickHandler.call(cleaner, ev),
    );

    const nameSpan = fragment.querySelector(".cleaner-name") as HTMLElement;
    nameSpan.style.borderLeftColor = color;
    nameSpan.innerText = name;

    return cleaner;
}

async function cleanerClickHandler(this: CleanerElement, ev: MouseEvent) {
    const current = readCleanerState(this);

    let next: CleanerState;
    switch (current) {
        case "load":
        case "ready":
        case "readyDone":
            {
                const confirmTimer = setTimeout(
                    () => setCleanerState(this, "ready"),
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
                    () => setCleanerState(this, "ready"),
                    confirmTimeoutMs,
                );
                next = { confirmTimer };
            } else {
                const { confirmTimer } = current;
                clearTimeout(confirmTimer);

                (async () => {
                    const { cookieStoreId } = this.dataset;
                    await cleanContextualIdentity(cookieStoreId as string);
                    const doneTimer = setTimeout(
                        () => setCleanerState(this, "readyDone"),
                        doneTimeoutMs,
                    );
                    setCleanerState(this, { doneTimer });
                })();

                next = "inProgress";
            }
    }
    setCleanerState(this, next);
}

function readCleanerState(ce: CleanerElement): CleanerState {
    const { state, timer } = ce.dataset;
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

function setCleanerState(ce: CleanerElement, cs: CleanerState) {
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

    const { dataset } = ce;
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

async function pinClickHandler(this: CleanerElement, ev: MouseEvent) {
    const options = await readLocalOptions();
    let pinnedIds: string[];

    const { dataset } = this;
    const cookieStoreId = dataset.cookieStoreId as string;
    if ("pinOrder" in dataset) {
        // unpin
        pinnedIds = options.pinnedIds.filter(v => v !== cookieStoreId);
        delete dataset.pinOrder;
    } else {
        // pin
        pinnedIds = [...options.pinnedIds, cookieStoreId];
        dataset.pinOrder = "" + Number.MAX_SAFE_INTEGER; // For now, insert at the end.
    }

    options.pinnedIds = pinnedIds;
    await writeLocalOptions(options);

    fixPinOrder();
    orderCleaners();
}

function fixPinOrder() {
    const list = document.querySelector("#cleaner-list") as HTMLElement;
    const all = Array.from(list.querySelectorAll("li")) as CleanerElement[];
    const pinned = all.filter(ce => "pinOrder" in ce.dataset);
    sortMap(pinned, ce => parseInt(ce.dataset.pinOrder as string))
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
        switch (readCleanerState(ce)) {
            case "ready":
            case "readyDone":
                return true;
            default:
                return false;
        }
    }).forEach(ce => setCleanerState(ce, "load"));

    // Place pinned containers first.
    const [pinned, notPinned] = subdivide(all, ce => "pinOrder" in ce.dataset);
    list.append(
        ...sortMap(pinned, ce => parseInt(ce.dataset.pinOrder as string)),
    );

    if (pinned.length > 0 && notPinned.length > 0) {
        const hr = document.createElement("hr");
        hr.id = "divider-pinned";
        list.appendChild(hr);
    }

    // Next, built-in containers that aren't pinned.
    const [user, builtIn] = subdivide(
        notPinned,
        ce => "queryOrder" in ce.dataset,
    );
    list.append(...sortMap(builtIn, ce => ce.innerText));

    if (builtIn.length > 0 && user.length > 0) {
        const hr = document.createElement("hr");
        hr.id = "divider-user";
        list.appendChild(hr);
    }

    // Finally, user containers that aren't pinned.
    list.append(
        ...sortMap(user, ce => parseInt(ce.dataset.queryOrder as string)),
    );
}

popupMain();
