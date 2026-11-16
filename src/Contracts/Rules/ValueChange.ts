import type { ChangeArea } from './ChangeArea';

export interface ValueChange {
    area: ChangeArea;
    name: string;
    before: string | null;
    after: string | null;
}
