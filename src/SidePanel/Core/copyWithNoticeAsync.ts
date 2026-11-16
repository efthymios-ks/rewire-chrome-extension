import type { ClipboardClient } from './ClipboardClient';
import type { Notifier } from './Notifier';

export interface CopyWithNoticeOptions {
    context: {
        clipboardClient: ClipboardClient;
        notifier: Notifier;
    };
    text: string;
    successMessage: string;
}

export async function copyWithNoticeAsync({
    context,
    text,
    successMessage,
}: CopyWithNoticeOptions): Promise<void> {
    const copied = await context.clipboardClient.copyAsync(text);
    context.notifier.show(copied.hasErrors ? copied.error : successMessage);
}
