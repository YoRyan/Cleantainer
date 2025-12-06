import { cleanContainer } from "./browsing-data.js";
import { readLocalOptions } from "./storage.js";

const badgeTimeoutMs = 3000;
const badgeBgColor = "red";
const badgeColor = "white";

browser.commands.onCommand.addListener(async command => {
    switch (command) {
        case "clean-shortcut-1":
            return cleanShortcut(0);
        case "clean-shortcut-2":
            return cleanShortcut(1);
        case "clean-shortcut-3":
            return cleanShortcut(2);
        case "clean-shortcut-4":
            return cleanShortcut(3);
        default:
            return;
    }
});

async function cleanShortcut(idx: number) {
    const options = await readLocalOptions();
    const shortcut = options.shortcuts[idx];
    const userContainers = await browser.contextualIdentities.query({});

    const cookieStoreIds = new Set<string>(shortcut.userContainerIds);
    if (shortcut.defaultContainer) {
        cookieStoreIds.add("firefox-default");
    }
    if (shortcut.privateContainer) {
        cookieStoreIds.add("firefox-private");
    }
    if (shortcut.userContainerNames.enabled) {
        let re: RegExp;
        try {
            re = new RegExp(shortcut.userContainerNames.regex);
        } catch {
            re = /$impossible/;
        }
        userContainers
            .filter(ci => re.test(ci.name))
            .map(({ cookieStoreId }) => cookieStoreId)
            .forEach(id => cookieStoreIds.add(id));
    }
    if (cookieStoreIds.size <= 0) {
        return;
    }
    const doCleans = cookieStoreIds.values().map(cleanContainer);

    const idToName = new Map<string, string>([
        ["firefox-default", browser.i18n.getMessage("containerDefault")],
        ["firefox-private", browser.i18n.getMessage("containerPrivate")],
        ...userContainers.map(
            ci => [ci.cookieStoreId, ci.name] as [string, string],
        ),
    ]);
    const doNotify = showNotification(
        idx,
        Array.from(cookieStoreIds)
            .map(id => idToName.get(id) ?? id)
            .sort(),
    );

    await Promise.all([...doCleans, doNotify]);
}

async function showNotification(idx: number, names: string[]) {
    if (browser.notifications) {
        const containers = new Intl.ListFormat(browser.i18n.getUILanguage(), {
            style: "long",
            type: "conjunction",
        }).format(names);
        const title = browser.i18n.getMessage("cleanShortcutNotifyTitle");
        const message = browser.i18n.getMessage(
            "cleanShortcutNotifyMessage",
            containers,
        );
        browser.notifications.create({ type: "basic", title, message });
    }

    const { setBadgeBackgroundColor, setBadgeTextColor, setBadgeText } =
        browser.action;
    const text = "" + (idx + 1);
    setBadgeBackgroundColor({ color: badgeBgColor });
    setBadgeTextColor({ color: badgeColor });
    setBadgeText({ text });

    await sleep(badgeTimeoutMs);
    setBadgeText({ text: null });
}

async function sleep(ms: number) {
    const { promise, resolve } = Promise.withResolvers();
    setTimeout(resolve, ms);
    return promise;
}
