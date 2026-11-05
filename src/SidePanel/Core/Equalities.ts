export const Equalities = {
    json<TValue>(left: TValue, right: TValue): boolean {
        return JSON.stringify(left) === JSON.stringify(right);
    },

    shallowArray<TValue>(left: TValue[], right: TValue[]): boolean {
        return left.length === right.length && left.every((item, index) => Object.is(item, right[index]));
    },
};
