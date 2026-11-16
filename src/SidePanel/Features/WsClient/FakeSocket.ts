const OPEN_STATE = 1;
const CLOSED_STATE = 3;

export class FakeSocket extends EventTarget {
    binaryType = 'blob';
    readyState = OPEN_STATE;
    readonly sent: string[] = [];

    send(text: string): void {
        this.sent.push(text);
    }

    close(): void {
        this.readyState = CLOSED_STATE;
        this.dispatchEvent(new Event('close'));
    }

    receive(data: string | ArrayBuffer): void {
        this.dispatchEvent(new MessageEvent('message', {
            data,
        }));
    }
}
