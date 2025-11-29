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

    const cookieStoreIds = new Set<string>(list.userContainerIds);
    if (list.defaultContainer) {
        cookieStoreIds.add("firefox-default");
    }
    if (list.privateContainer) {
        cookieStoreIds.add("firefox-private");
    }
    if (list.userContainerNames.enabled) {
        const matches = await matchContainersByName(
            list.userContainerNames.regex,
        );
        matches.forEach(id => cookieStoreIds.add(id));
    }

    const doCleans = cookieStoreIds.values().map(cleanContainer);
    const showBadge = showBadgeStatus("" + cookieStoreIds.size);
    return Promise.all([...doCleans, showBadge]);
}

async function matchContainersByName(regex: string): Promise<string[]> {
    let re: RegExp;
    try {
        re = new RegExp(regex);
    } catch {
        return [];
    }

    const userContainers = await browser.contextualIdentities.query({});
    return userContainers
        .filter(ci => re.test(ci.name))
        .map(({ cookieStoreId }) => cookieStoreId);
}

async function showBadgeStatus(text: string) {
    const { setBadgeBackgroundColor, setBadgeTextColor, setBadgeText } =
        browser.action;
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
