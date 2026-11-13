import { Result } from "../../../Common/Results/Result";
import { FrameLabels } from "../../../Contracts/Live/FrameLabels";
import type { IDebuggerClient } from "../Debugging/IDebuggerClient";

const ClaimWindowInMilliseconds = 3000;

interface PendingSend {
    tabId: number;
    to: string;
    data: string;
    until: number;
}

function parsedObjectOf(data: string): object | null {
    try {
        const parsed: unknown = JSON.parse(data);

        return typeof parsed === "object" && parsed !== null ? parsed : null;
    } catch {
        return null;
    }
}

function payloadOf(data: string): { value: unknown; text: string } {
    const parsed = parsedObjectOf(data);

    return parsed === null
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
    if (target === FrameLabels.Top) {
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
    if (frame === undefined || frame.contentWindow === null) {
        return false;
    }

    frame.contentWindow.postMessage(${message}, "*");
    return true;
})()`;
}

export interface IPostMessageSender {
    send(
        tabId: number,
        target: string,
        data: string
    ): Promise<Result<void>>;
    claim(
        tabId: number,
        to: string,
        data: string
    ): boolean;
}

export class PostMessageSender implements IPostMessageSender {
    private readonly _debuggerClient: IDebuggerClient;
    private readonly _now: () => number;
    private _pending: PendingSend[] = [];

    constructor(debuggerClient: IDebuggerClient, now: () => number) {
        this._debuggerClient = debuggerClient;
        this._now = now;
    }

    async send(
        tabId: number,
        target: string,
        data: string
    ): Promise<Result<void>> {
        const payload = payloadOf(data);
        const pending: PendingSend = {
            tabId,
            to: target,
            data: payload.text,
            until: this._now() + ClaimWindowInMilliseconds,
        };
        this._pending = [
            ...this._pending.filter(item => item.until > this._now()),
            pending,
        ];

        const evaluated = await this._debuggerClient.sendToSession(
            tabId,
            null,
            "Runtime.evaluate",
            {
                expression: expressionOf(target, payload.value),
                returnByValue: true,
            }
        );
        if (evaluated.hasErrors) {
            this.drop(pending);

            return evaluated;
        }

        if (evaluated.value.exceptionDetails !== undefined) {
            this.drop(pending);

            return Result.fail(`Sending failed: ${evaluated.value.exceptionDetails.exception?.description ?? evaluated.value.exceptionDetails.text}`);
        }

        if (evaluated.value.result.value !== true) {
            this.drop(pending);

            return Result.fail(`No iframe from ${target} on the page.`);
        }

        return Result.done();
    }

    claim(
        tabId: number,
        to: string,
        data: string
    ): boolean {
        const now = this._now();
        const match = this._pending.find(item => item.tabId === tabId && item.to === to && item.data === data && item.until > now);
        if (match === undefined) {
            return false;
        }

        this.drop(match);

        return true;
    }

    private drop(pending: PendingSend): void {
        this._pending = this._pending.filter(item => item !== pending);
    }
}
