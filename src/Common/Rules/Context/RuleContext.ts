export interface RuleContext {
    now(): Date;
    random(): number;
    variable(name: string): string | null;
    setVariable(name: string, value: string): void;
    render(text: string): string;
}
