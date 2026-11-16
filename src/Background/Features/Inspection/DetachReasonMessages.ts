import { OwnEntry } from '../../../Common/Objects/OwnEntry';

const DETACH_REASON_MESSAGE_MAP: Record<string, string> = Object.freeze({
    canceled_by_user: 'Debugging was canceled from the browser bar. Reattach to keep capturing.',
    target_closed: 'The tab was closed.',
});

const UNKNOWN_DETACH_MESSAGE = 'The debugger detached.';

export const DetachReasonMessages = {
    of(reason: string): string {
        return OwnEntry.of(DETACH_REASON_MESSAGE_MAP, reason) ?? UNKNOWN_DETACH_MESSAGE;
    },
};
