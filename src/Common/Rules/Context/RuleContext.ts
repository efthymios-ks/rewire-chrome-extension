import type { Criterion } from '../../../Contracts/Rules/Criterion';

export interface RuleContext {
    now(): Date;
    random(): number;
    sampleRoll(criterion: Criterion): number;
    variable(name: string): string | null;
    setVariable(name: string, value: string): void;
    render(text: string): string;
}
