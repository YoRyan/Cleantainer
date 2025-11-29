export async function cleanContainer(cookieStoreId: string) {
    await browser.browsingData.remove(
        {
            cookieStoreId,
            originTypes: {
                unprotectedWeb: true,
                protectedWeb: false,
                extension: false,
            },
        },
        {
            cookies: true,
            indexedDB: true,
            localStorage: true,
        },
    );
}
