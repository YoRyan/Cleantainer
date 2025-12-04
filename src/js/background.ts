import { cleanContainer } from "./browsing-data.js";
import { readLocalOptions } from "./storage.js";

const badgeTimeoutMs = 3000;
const badgeBgColor = "red";
const badgeColor = "white";

browser.commands.onCommand.addListener(async command => {
    switch (command) {
        case "quick-list-1":
            return cleanQuickList(0);
        default:
            return;
    }
});

async function cleanQuickList(idx: number) {
    const options = await readLocalOptions();
    const list = options.quickLists[idx];
    const userContainers = await browser.contextualIdentities.query({});

    const cookieStoreIds = new Set<string>(list.userContainerIds);
    if (list.defaultContainer) {
        cookieStoreIds.add("firefox-default");
    }
    if (list.privateContainer) {
        cookieStoreIds.add("firefox-private");
    }
    if (list.userContainerNames.enabled) {
        let re: RegExp;
        try {
            re = new RegExp(list.userContainerNames.regex);
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
        Array.from(cookieStoreIds)
            .map(id => idToName.get(id) ?? id)
            .sort(),
    );

    await Promise.all([...doCleans, doNotify]);
}

async function showNotification(names: string[]) {
    if (browser.notifications) {
        const containers = new Intl.ListFormat(browser.i18n.getUILanguage(), {
            style: "long",
            type: "conjunction",
        }).format(names);
        const title = browser.i18n.getMessage("quickListNotifyTitle");
        const message = browser.i18n.getMessage(
            "quickListNotifyMessage",
            containers,
        );
        browser.notifications.create({
            type: "basic",
            title,
            message,
        });
    } else {
        const { setBadgeBackgroundColor, setBadgeTextColor, setBadgeText } =
            browser.action;
        const text = "" + names.length;
        setBadgeBackgroundColor({ color: badgeBgColor });
        setBadgeTextColor({ color: badgeColor });
        setBadgeText({ text });

        await sleep(badgeTimeoutMs);
        setBadgeText({ text: null });
    }
}

async function sleep(ms: number) {
    const { promise, resolve } = Promise.withResolvers();
    setTimeout(resolve, ms);
    return promise;
}
