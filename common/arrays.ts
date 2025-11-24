export function findValue<T>(arr: T[], value: T): number | undefined {
    const i = arr.findIndex(v => v === value);
    return i !== -1 ? i : undefined;
}

export function subdivide<T>(
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
