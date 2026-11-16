async function runAfterAsync(previous: Promise<void>, task: () => Promise<void>): Promise<void> {
    await previous;
    await task();
}

async function settleAsync(run: Promise<void>): Promise<void> {
    try {
        await run;
    } catch {
        // The caller observes the failure through its own promise; the queue keeps going.
    }
}

export class SerialTaskQueue {
    private _tail: Promise<void> = Promise.resolve();

    enqueueAsync(task: () => Promise<void>): Promise<void> {
        const run = runAfterAsync(this._tail, task);
        this._tail = settleAsync(run);

        return run;
    }
}
