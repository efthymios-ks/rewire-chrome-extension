import type { NoticeAction } from './NoticeAction';

export interface Notice {
    message: string;
    action: NoticeAction | null;
}
