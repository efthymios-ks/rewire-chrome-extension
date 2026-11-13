const OpenState = 1;
const ClosedState = 3;

export class FakeSocket extends EventTarget {
    binaryType = "blob";
    readyState = OpenState;
    readonly sent: string[] = [];

    send(text: string): void {
        this.sent.push(text);
    }

    close(): void {
        this.readyState = ClosedState;
        this.dispatchEvent(new Event("close"));
    }

    receive(data: string | ArrayBuffer): void {
        this.dispatchEvent(new MessageEvent("message", {
            data,
        }));
    }
}
