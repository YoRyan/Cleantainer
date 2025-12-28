export type Options = {
    shortcuts: Shortcut[];
    pinnedIds: string[];
    uiDensity: "default" | "touch";
};

export type Shortcut = {
    defaultContainer: boolean;
    privateContainer: boolean;
    userContainerIds: string[];
    userContainerNames: {
        enabled: boolean;
        regex: string;
    };
};

const nShortcuts = 4;

export async function readLocalOptions(): Promise<Options> {
    const storage = await browser.storage.local.get(null);
    return readOptions(storage);
}

export async function writeLocalOptions(options: Options) {
    return browser.storage.local.set(options);
}

export function readOptions(obj: unknown): Options {
    let shortcuts: Shortcut[] = [],
        pinnedIds: string[] = [],
        uiDensity: "default" | "touch" = "default";
    fail: do {
        if (typeof obj !== "object" || obj === null) {
            break fail;
        }

        if ("shortcuts" in obj) {
            shortcuts = Array.from(Object.values(Object(obj.shortcuts))).map(
                readShortcut,
            );
        }

        if ("pinnedIds" in obj) {
            pinnedIds = Array.from(Object.values(Object(obj.pinnedIds))).filter(
                s => typeof s === "string",
            );
        }

        if ("uiDensity" in obj && obj.uiDensity === "touch") {
            uiDensity = "touch";
        }
    } while (false);

    // Ensure shortcuts has the correct number of items.
    while (shortcuts.length < nShortcuts) {
        shortcuts.push(readShortcut(undefined));
    }

    return { shortcuts, pinnedIds, uiDensity };
}

function readShortcut(obj: unknown): Shortcut {
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
                Object.values(Object(obj.userContainerIds)),
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

export async function readExtensionShortcuts() {
    const commands = await browser.commands.getAll();
    return Object.fromEntries(
        commands.map(c => [c.name as string, c.shortcut as string]),
    );
}

export async function writeExtensionShortcuts(toShortcut: {
    [name: string]: string;
}) {
    const doUpdates = Object.entries(toShortcut).map(async ([name, shortcut]) =>
        browser.commands.update({ name, shortcut }),
    );
    await Promise.allSettled(doUpdates);
}
