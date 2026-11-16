import { Result } from '../../../Common/Results/Result';
import { FRAME_LABELS } from '../../../Contracts/Live/FrameLabels';
import type { DebuggerClient } from '../Debugging/DebuggerClient';
import type { ClaimOptions, PostMessageSender, SendAsyncOptions } from './PostMessageSender';

const CLAIM_WINDOW_IN_MILLISECONDS = 3000;

interface PendingSend {
    tabId: number;
    to: string;
    data: string;
    until: number;
}

function parsedObjectOf(data: string): object | null {
    try {
        const parsed: unknown = JSON.parse(data);

        return typeof parsed === 'object' && parsed != null ? parsed : null;
    } catch {
        return null;
    }
}

function payloadOf(data: string): { value: unknown; text: string } {
    const parsed = parsedObjectOf(data);

    return parsed == null
        ? {
            value: data,
            text: data,
        }
        : {
            value: parsed,
            text: JSON.stringify(parsed),
        };
}

function expressionOf(target: string, value: unknown): string {
    const message = JSON.stringify(value);
    if (target === FRAME_LABELS.Top) {
        return `(() => { window.postMessage(${message}, "*"); return true; })()`;
    }

    return `(() => {
    const host = ${JSON.stringify(target)};
    const frame = [...document.querySelectorAll("iframe, frame")].find(element => {
        try {
            return new URL(element.src, location.href).hostname === host;
        } catch {
            return false;
        }
    });
    if (frame == null || frame.contentWindow == null) {
        return false;
    }

    frame.contentWindow.postMessage(${message}, "*");
    return true;
})()`;
}

export class DefaultPostMessageSender implements PostMessageSender {
    private readonly _debuggerClient: DebuggerClient;
    private readonly _now: () => number;
    private _pending: PendingSend[] = [];

    constructor(debuggerClient: DebuggerClient, now: () => number) {
        this._debuggerClient = debuggerClient;
        this._now = now;
    }

    async sendAsync({ tabId, target, data }: SendAsyncOptions): Promise<Result<void>> {
        const payload = payloadOf(data);
        const pending: PendingSend = {
            tabId,
            to: target,
            data: payload.text,
            until: this._now() + CLAIM_WINDOW_IN_MILLISECONDS,
        };
        this._pending = [
            ...this._pending.filter(item => item.until > this._now()),
            pending,
        ];

        const evaluated = await this._debuggerClient.sendToSessionAsync(
            /* tabId: */ tabId,
            /* sessionId: */ null,
            /* command: */ 'Runtime.evaluate',
            /* params: */ {
                expression: expressionOf(target, payload.value),
                returnByValue: true,
            },
        );
        if (evaluated.hasErrors) {
            this.drop(pending);

            return evaluated;
        }

        if (evaluated.value.exceptionDetails != null) {
            this.drop(pending);

            const { exception, text } = evaluated.value.exceptionDetails;

            return Result.fail(`Sending failed: ${exception?.description ?? text}`);
        }

        if (evaluated.value.result.value !== true) {
            this.drop(pending);

            return Result.fail(`No iframe from ${target} on the page.`);
        }

        return Result.done();
    }

    claim({ tabId, to, data }: ClaimOptions): boolean {
        const now = this._now();
        const match = this._pending.find(item => item.tabId === tabId
            && item.to === to
            && item.data === data
            && item.until > now);
        if (match == null) {
            return false;
        }

        this.drop(match);

        return true;
    }

    private drop(pending: PendingSend): void {
        this._pending = this._pending.filter(item => item !== pending);
    }
}
