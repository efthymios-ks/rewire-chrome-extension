const ONE = 1;

export interface CountTextOfOptions {
    count: number;
    singular: string;
    plural?: string;
}

export const CountText = {
    of({ count, singular, plural = `${singular}s` }: CountTextOfOptions): string {
        return count === ONE ? `${count} ${singular}` : `${count} ${plural}`;
    },
};
