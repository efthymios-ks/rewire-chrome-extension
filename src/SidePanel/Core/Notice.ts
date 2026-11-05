export interface NoticeAction {
    label: string;
    run: () => void;
}

export interface Notice {
    message: string;
    action: NoticeAction | null;
}
