export type Options = {
    quickLists: QuickList[];
    pinnedIds: string[];
};

export type QuickList = {
    defaultContainer: boolean;
    privateContainer: boolean;
    userContainerIds: string[];
    userContainerNames: {
        enabled: boolean;
        regex: string;
    };
};

const nQuickLists = 1;

export async function readLocalOptions(): Promise<Options> {
    const storage = await browser.storage.local.get(null);
    return readOptions(storage);
}

export async function writeLocalOptions(options: Options) {
    return browser.storage.local.set(options);
}

export function readOptions(obj: unknown): Options {
    let quickLists: QuickList[] = [],
        pinnedIds: string[] = [];
    fail: do {
        if (typeof obj !== "object" || obj === null) {
            break fail;
        }

        if ("quickLists" in obj) {
            quickLists = Array.from(
                Object.values(new Object(obj.quickLists)),
            ).map(readQuickList);
        }
        // Ensure quickLists has the correct number of items.
        for (let i = 0; i < nQuickLists - quickLists.length; i++) {
            quickLists.push(readQuickList(undefined));
        }

        if ("pinnedIds" in obj) {
            pinnedIds = Array.from(
                Object.values(new Object(obj.pinnedIds)),
            ).filter(s => typeof s === "string");
        }
    } while (false);
    return { quickLists, pinnedIds };
}

function readQuickList(obj: unknown): QuickList {
    let defaultContainer = false,
        privateContainer = false,
        userContainerIds: string[] = [],
        userContainerNames = {
            enabled: false,
            regex: "",
        };
    fail: do {
        if (typeof obj !== "object" || obj === null) {
            break fail;
        }

        if (
            "defaultContainer" in obj &&
            typeof obj.defaultContainer === "boolean"
        ) {
            defaultContainer = obj.defaultContainer;
        }
        if (
            "privateContainer" in obj &&
            typeof obj.privateContainer === "boolean"
        ) {
            privateContainer = obj.privateContainer;
        }
        if ("userContainerIds" in obj) {
            userContainerIds = Array.from(
                Object.values(new Object(obj.userContainerIds)),
            ).map(u => (typeof u === "string" ? u : ""));
        }
        if (
            "userContainerNames" in obj &&
            typeof obj.userContainerNames === "object" &&
            obj.userContainerNames !== null
        ) {
            const ucn = obj.userContainerNames;
            const enabled =
                "enabled" in ucn && typeof ucn.enabled === "boolean"
                    ? ucn.enabled
                    : false;
            const regex =
                "regex" in ucn && typeof ucn.regex === "string"
                    ? ucn.regex
                    : "";
            userContainerNames = { enabled, regex };
        }
    } while (false);
    return {
        defaultContainer,
        privateContainer,
        userContainerIds,
        userContainerNames,
    };
}
