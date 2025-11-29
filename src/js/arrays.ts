export function findValue<T>(arr: T[], value: T): number | undefined {
    const i = arr.findIndex(v => v === value);
    return i !== -1 ? i : undefined;
}

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

export function sortByMap<T>(
    arr: T[],
    mapFn: (value: T) => string | number,
): T[] {
    return arr.sort((a, b) => {
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
