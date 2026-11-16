export interface VariableStore {
    get(name: string): string | null;
    set(name: string, value: string): void;
    snapshot(): Map<string, string>;
    subscribe(listener: () => void): void;
}
