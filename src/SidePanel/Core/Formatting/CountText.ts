const One = 1;

export const CountText = {
    of(
        count: number,
        singular: string,
        plural: string = `${singular}s`
    ): string {
        return count === One ? `${count} ${singular}` : `${count} ${plural}`;
    },
};
