/**
 * Return the first index in the array that contains the provided value, or
 * undefined if the value is not present.
 */
export function findValue<T>(arr: T[], value: T): number | undefined {
    const i = arr.findIndex(v => v === value);
    return i !== -1 ? i : undefined;
}

/**
 * Divide an array into two arrays. Which array each item is assigned to depends
 * on the return value of the predicate.
 */
export function partition<T>(
    arr: T[],
    predicate: (value: T) => boolean,
): [isTrue: T[], isFalse: T[]] {
    let isTrue: T[] = [],
        isFalse: T[] = [];
    for (const value of arr) {
        if (predicate(value)) {
            isTrue.push(value);
        } else {
            isFalse.push(value);
        }
    }
    return [isTrue, isFalse];
}

/**
 * Sort an array, using the provided function to map items to their relative
 * values for sorting. The return values of the map function will be discarded
 * and the items will be returned as originally passed.
 */
export function sortByMap<T>(
    arr: T[],
    mapFn: (value: T) => string | number,
): T[] {
    return arr.toSorted((a, b) => {
        const av = mapFn(a);
        const bv = mapFn(b);
        if (av < bv) {
            return -1;
        } else if (av > bv) {
            return 1;
        } else {
            return 0;
        }
    });
}
