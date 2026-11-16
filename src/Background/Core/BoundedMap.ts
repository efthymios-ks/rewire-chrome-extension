export class BoundedMap<TKey, TValue> extends Map<TKey, TValue> {
    private readonly _maxSize: number;

    constructor(maxSize: number) {
        super();
        this._maxSize = maxSize;
    }

    override set(key: TKey, value: TValue): this {
        super.set(key, value);
        while (this.size > this._maxSize) {
            const oldest = this.keys().next();
            if (oldest.done === true) {
                break;
            }

            this.delete(oldest.value);
        }

        return this;
    }
}
