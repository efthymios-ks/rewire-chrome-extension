const DetachReasonMessageMap: Record<string, string> = {
    canceled_by_user: "Debugging was canceled from the browser bar. Reattach to keep capturing.",
    target_closed: "The tab was closed.",
};

const UnknownDetachMessage = "The debugger detached.";

export const DetachReasonMessages = {
    of(reason: string): string {
        return DetachReasonMessageMap[reason] ?? UnknownDetachMessage;
    },
};
