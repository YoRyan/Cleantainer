/** Clean browsing data from a contextual identity. */
export async function cleanContainer(cookieStoreId: string) {
    let dataToRemove: browser.browsingData.DataTypeSet;
    if (cookieStoreId === "firefox-private") {
        // As of Firefox 146, clearing IndexedDB and localStorage for the
        // private container does not work and silently fails.
        // https://github.com/mozilla-firefox/firefox/blob/main/toolkit/components/extensions/test/mochitest/test_ext_browsingData_indexedDB.html
        // https://github.com/mozilla-firefox/firefox/blob/main/toolkit/components/extensions/test/mochitest/test_ext_browsingData_localStorage.html
        dataToRemove = {
            cookies: true,
            // Clearing sessionStorage works. That's tied to the localStorage
            // flag.
            // https://github.com/mozilla-firefox/firefox/blob/main/toolkit/components/extensions/test/mochitest/test_ext_browsingData_sessionStorage.html
            localStorage: true,
        };
    } else {
        dataToRemove = {
            cookies: true,
            indexedDB: true,
            localStorage: true,
        };
    }
    await browser.browsingData.remove(
        {
            cookieStoreId,
            originTypes: {
                unprotectedWeb: true,
                protectedWeb: false,
                extension: false,
            },
        },
        dataToRemove,
    );
}
