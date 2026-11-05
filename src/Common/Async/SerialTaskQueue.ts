export class SerialTaskQueue {
    private _tail: Promise<void> = Promise.resolve();

    enqueue(task: () => Promise<void>): Promise<void> {
        const run = this._tail.then(task);
        this._tail = run.catch(() => undefined);

        return run;
    }
}
