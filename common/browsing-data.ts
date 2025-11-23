export async function cleanContextualIdentity(cookieStoreId: string) {
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
