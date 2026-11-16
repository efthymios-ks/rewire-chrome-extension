import { OwnEntry } from '../../Objects/OwnEntry';

const LONG_PREFIX = '--';
const INLINE_VALUE_SEPARATOR = '=';

export interface CommandOptionsDefinition<TState> {
    valueHandlers: Readonly<Record<string, (state: TState, value: string) => void>>;
    flagHandlers?: Readonly<Record<string, (state: TState) => void>>;
    ignoredValueOptions: string[];
}

export interface ApplyValueOptions<TState> {
    state: TState;
    option: string;
    value: string;
}

export interface ReadLongOptions<TState> {
    state: TState;
    args: string[];
    index: number;
}

export class CommandOptions<TState> {
    private readonly _definition: CommandOptionsDefinition<TState>;

    constructor(definition: CommandOptionsDefinition<TState>) {
        this._definition = definition;
    }

    static isLong(argument: string): boolean {
        return argument.startsWith(LONG_PREFIX) && argument.length > LONG_PREFIX.length;
    }

    takesValue(option: string): boolean {
        return OwnEntry.of(this._definition.valueHandlers, option) != null
            || this._definition.ignoredValueOptions.includes(option);
    }

    applyValue({ state, option, value }: ApplyValueOptions<TState>): void {
        OwnEntry.of(this._definition.valueHandlers, option)?.(state, value);
    }

    applyFlag(state: TState, option: string): void {
        OwnEntry.of(this._definition.flagHandlers ?? {}, option)?.(state);
    }

    readLong({ state, args, index }: ReadLongOptions<TState>): number {
        const argument = args[index] ?? '';
        const separator = argument.indexOf(INLINE_VALUE_SEPARATOR);
        const named = separator === -1 ? argument : argument.slice(0, separator);
        const option = named.slice(LONG_PREFIX.length);
        if (!this.takesValue(option)) {
            this.applyFlag(state, option);

            return index;
        }

        const lastIndex = separator === -1 ? index + 1 : index;
        const value = separator === -1 ? args[lastIndex] : argument.slice(separator + 1);
        if (value != null) {
            this.applyValue({ state, option, value });
        }

        return lastIndex;
    }
}
