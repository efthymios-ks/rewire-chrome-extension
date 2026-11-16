export const Equalities = {
    shallowArray<TValue>(left: TValue[], right: TValue[]): boolean {
        return left.length === right.length && left.every((item, index) => Object.is(item, right[index]));
    },
};
