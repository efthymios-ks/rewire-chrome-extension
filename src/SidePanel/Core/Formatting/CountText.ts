const One = 1;

export const CountText = {
    of(count: number, singular: string): string {
        return count === One ? `${count} ${singular}` : `${count} ${singular}s`;
    },
};
